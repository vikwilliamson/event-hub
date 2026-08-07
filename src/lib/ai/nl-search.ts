import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { CITIES, findCity } from "@/lib/cities";
import { EVENT_CATEGORIES, type Event } from "@/lib/types";
import { parseEventSearchParams, searchEvents } from "@/lib/search";

const TIMEOUT_MS = 8000;
const MODEL = "claude-opus-4-8";
const MAX_RADIUS_KM = 500;

/**
 * Natural-language search: Claude extracts a structured query
 * ("free tech events near Denver" → {text, category, city, radiusKm}),
 * which feeds the existing deterministic searchEvents pipeline via URL
 * params. Any failure — no API key, timeout, refusal, malformed output —
 * falls back to treating the whole input as a plain text search.
 */

const extractionSchema = z.object({
  text: z.string().nullable(),
  category: z.string().nullable(),
  city: z.string().nullable(),
  radiusKm: z.number().nullable(),
});

/** JSON Schema for the structured-output response (mirrors extractionSchema). */
export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    text: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description:
        "Distinctive content keyword(s) matched as a literal, case-insensitive " +
        "substring against event title/description/venue and AND-ed with the other " +
        "filters. Use only for specific words likely to appear verbatim in an event " +
        "(e.g. 'salsa', 'kayak', 'jazz'). Null when the query is already covered by " +
        "category and/or city, or when the leftover words are generic qualifiers that " +
        "won't appear in event text (e.g. 'free', 'cheap', 'fun', 'cool', 'best', " +
        "'events', 'things to do', 'activities', 'this weekend', 'near me').",
    },
    category: {
      // Nullable enums must be expressed with anyOf: the structured-output
      // validator rejects `enum` combined with an array-form type union.
      anyOf: [{ type: "string", enum: [...EVENT_CATEGORIES] }, { type: "null" }],
      description: "Event category, only when clearly implied.",
    },
    city: {
      anyOf: [{ type: "string", enum: [...CITIES.map((c) => c.slug)] }, { type: "null" }],
      description:
        "Closest supported city when the query mentions a place. Null when no location is mentioned or none is close.",
    },
    radiusKm: {
      anyOf: [{ type: "number" }, { type: "null" }],
      description:
        "Search radius in km, only when the query implies one (e.g. 'within 10 miles'). Null otherwise.",
    },
  },
  required: ["text", "category", "city", "radiusKm"],
  additionalProperties: false,
} as const;

function fallback(query: string): URLSearchParams {
  const params = new URLSearchParams();
  const text = query.trim();
  if (text) params.set("q", text);
  return params;
}

/**
 * Pure mapping from a raw extraction to /events URL params. Invalid shapes
 * fall back to a plain text search; unknown categories/cities are dropped
 * field-by-field so a partly-useful extraction still helps.
 */
export function extractionToSearchParams(
  raw: unknown,
  originalQuery: string
): URLSearchParams {
  const parsed = extractionSchema.safeParse(raw);
  if (!parsed.success) return fallback(originalQuery);

  const { text, category, city, radiusKm } = parsed.data;
  const params = new URLSearchParams();

  if (text?.trim()) params.set("q", text.trim());
  if (category && (EVENT_CATEGORIES as readonly string[]).includes(category)) {
    params.set("category", category);
  }
  if (city && findCity(city)) {
    params.set("near", city);
    if (radiusKm !== null && Number.isFinite(radiusKm) && radiusKm > 0) {
      params.set("radius", String(Math.min(Math.round(radiusKm), MAX_RADIUS_KM)));
    }
  }
  return params;
}

/**
 * Safety net for the NL path: if the extracted search returns nothing but a
 * distinctive `q` term is combined with a category/city, the `q` is most likely
 * a spurious keyword the model couldn't map (the app has no price/date filters,
 * so words like "free" or "tonight" land in `q` and then AND out every match).
 * Retry once without `q`; if that yields results, prefer the widened params.
 * Only widens when there is another filter to fall back to — a bare `q` search
 * that finds nothing is a legitimate empty result, not something to broaden.
 */
export function widenSearchParamsIfEmpty(
  params: URLSearchParams,
  events: Event[]
): URLSearchParams {
  if (!params.get("q") || !(params.has("category") || params.has("near"))) {
    return params;
  }
  if (searchEvents(events, parseEventSearchParams(Object.fromEntries(params))).length > 0) {
    return params;
  }
  const widened = new URLSearchParams(params);
  widened.delete("q");
  return searchEvents(events, parseEventSearchParams(Object.fromEntries(widened))).length > 0
    ? widened
    : params;
}

export async function parseNaturalSearch(query: string): Promise<URLSearchParams> {
  if (!env.ANTHROPIC_API_KEY || !query.trim()) return fallback(query);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        system:
          "Convert a natural-language event search into a structured filter for a local events app. " +
          "Extract only what the query states or clearly implies; use null for anything absent. " +
          "Map place names to the closest supported city; convert miles to kilometers. " +
          "The `text` field is matched as a literal, case-insensitive substring against each " +
          "event's title, description, and venue, and is combined with the other filters using AND — " +
          "so a `text` value that does not appear verbatim in an event removes it from the results. " +
          "Put ONLY distinctive content words in `text` (activity types, topics, or proper nouns " +
          "likely to appear in an event, e.g. 'salsa', 'kayak', 'jazz'). Leave `text` null when the " +
          "query is already captured by category and/or city, or when the remaining words are generic " +
          "qualifiers that won't appear in event text (e.g. 'free', 'cheap', 'fun', 'cool', 'best', " +
          "'events', 'things to do', 'activities', 'this weekend', 'near me'). The app has no price " +
          "filter, so ignore affordability words like 'free' or 'cheap' rather than putting them in `text`.",
        output_config: {
          format: {
            type: "json_schema",
            schema: EXTRACTION_JSON_SCHEMA,
          },
        },
        messages: [{ role: "user", content: query }],
      },
      { signal: controller.signal }
    );

    if (message.stop_reason === "refusal") return fallback(query);

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    return extractionToSearchParams(JSON.parse(text), query);
  } catch {
    return fallback(query);
  } finally {
    clearTimeout(timeout);
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { CITIES, findCity } from "@/lib/cities";
import { EVENT_CATEGORIES } from "@/lib/types";

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
const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    text: {
      type: ["string", "null"],
      description:
        "Keywords to match against event titles/descriptions/venues. Null if the query is purely locational or categorical.",
    },
    category: {
      type: ["string", "null"],
      enum: [...EVENT_CATEGORIES, null],
      description: "Event category, only when clearly implied.",
    },
    city: {
      type: ["string", "null"],
      enum: [...CITIES.map((c) => c.slug), null],
      description:
        "Closest supported city when the query mentions a place. Null when no location is mentioned or none is close.",
    },
    radiusKm: {
      type: ["number", "null"],
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
          "Map place names to the closest supported city; convert miles to kilometers.",
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

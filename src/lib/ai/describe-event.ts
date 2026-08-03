import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

const TIMEOUT_MS = 10000;
const MODEL = "claude-opus-4-8";

export type DescribeEventInput = {
  title: string;
  /** Optional bullet points / rough notes from the organizer. */
  notes?: string;
};

export type DescribeEventResult =
  | { ok: true; description: string }
  | { ok: false; error: string };

const UNAVAILABLE: DescribeEventResult = {
  ok: false,
  error: "AI drafting is not available right now. Please write the description manually.",
};

/**
 * Drafts an event description from the organizer's title and rough notes.
 * Key-gated (DEC-5): callers should hide the feature when ANTHROPIC_API_KEY
 * is absent; this function still fails soft if called anyway.
 */
export async function generateEventDescription(
  input: DescribeEventInput
): Promise<DescribeEventResult> {
  if (!env.ANTHROPIC_API_KEY || !input.title.trim()) return UNAVAILABLE;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        system:
          "You write event descriptions for a local event discovery app. " +
          "Given a title and the organizer's rough notes, write an inviting description of 40-90 words: " +
          "what the event is, what attendees will do or get, and who it's for. " +
          "Flowing prose only - no headers, bullet points, emoji, or hashtags. " +
          "Never invent specifics (prices, times, speaker names) that are not in the notes. " +
          "Respond with the description text only.",
        messages: [
          {
            role: "user",
            content: input.notes?.trim()
              ? `Title: ${input.title}\nNotes: ${input.notes}`
              : `Title: ${input.title}`,
          },
        ],
      },
      { signal: controller.signal }
    );

    if (message.stop_reason === "refusal") return UNAVAILABLE;

    const description = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return description ? { ok: true, description } : UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  } finally {
    clearTimeout(timeout);
  }
}

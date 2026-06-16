import Anthropic from "@anthropic-ai/sdk";
import type { Event } from "@/lib/firebase/types";
import { env } from "@/lib/env";
import { buildRsvpConfirmationEmail, type EmailContent } from "./templates/rsvp-confirmation";

const TIMEOUT_MS = 5000;
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 400;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildPrompt(event: Event, displayName: string, appUrl: string): string {
  return `You are writing a confirmation email for someone who just RSVPed to an event.

Event: ${event.title}
Date: ${formatDate(event.startsAt)}
Location: ${event.location}
Organizer: ${event.organizerName}
Description: ${event.description}
Attendee name: ${displayName}
RSVPs dashboard: ${appUrl}/my-rsvps

Write a warm, friendly confirmation email (80–200 words) that:
- Opens by addressing the attendee by first name
- Mentions the event name, date, and location naturally
- Conveys genuine enthusiasm for the event
- Ends with a clear note that they can manage their RSVP at the RSVPs dashboard URL above
- Does not use bullet points or headers — flowing prose only

Do not include a subject line. Do not include a sign-off name — that will be added separately.`;
}

export async function generateRsvpConfirmationEmail(
  event: Event,
  displayName: string,
  appUrl: string
): Promise<EmailContent & { generatedByAI: boolean }> {
  if (!env.ANTHROPIC_API_KEY) {
    return { ...buildRsvpConfirmationEmail(event, displayName, appUrl), generatedByAI: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: buildPrompt(event, displayName, appUrl) }],
      },
      { signal: controller.signal }
    );

    const body = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    if (!body.trim()) {
      return { ...buildRsvpConfirmationEmail(event, displayName, appUrl), generatedByAI: false };
    }

    return {
      subject: `You're registered: ${event.title}`,
      text: body,
      generatedByAI: true,
    };
  } catch {
    return { ...buildRsvpConfirmationEmail(event, displayName, appUrl), generatedByAI: false };
  } finally {
    clearTimeout(timeout);
  }
}

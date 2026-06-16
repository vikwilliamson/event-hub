import type { Event } from "@/lib/firebase/types";

export interface EmailContent {
  subject: string;
  text: string;
}

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

export function buildEventCancellationEmail(
  event: Event,
  displayName: string
): EmailContent {
  const firstName = displayName.split(" ")[0] ?? displayName;
  const formattedDate = formatDate(event.startsAt);

  const text = `Hi ${firstName},

We're sorry to let you know that ${event.title} has been cancelled.

The event was scheduled for ${formattedDate} at ${event.location}.

We hope to see you at a future event. Thank you for your understanding.`;

  return {
    subject: `Event cancelled: ${event.title}`,
    text,
  };
}

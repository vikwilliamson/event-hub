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

export function buildRsvpConfirmationEmail(
  event: Event,
  displayName: string,
  appUrl: string
): EmailContent {
  const firstName = displayName.split(" ")[0] ?? displayName;
  const formattedDate = formatDate(event.startsAt);
  const myRsvpsUrl = `${appUrl}/my-rsvps`;

  const text = `Hi ${firstName},

You're registered for ${event.title}!

Date: ${formattedDate}
Location: ${event.location}
Organized by: ${event.organizerName}

We look forward to seeing you there. You can manage your RSVPs at any time from your dashboard: ${myRsvpsUrl}

See you soon!`;

  return {
    subject: `You're registered: ${event.title}`,
    text,
  };
}

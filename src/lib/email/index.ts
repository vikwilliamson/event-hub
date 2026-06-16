import { Resend } from "resend";
import { env } from "@/lib/env";
import type { Event } from "@/lib/firebase/types";
import { generateRsvpConfirmationEmail } from "./ai-confirmation";
import { buildEventCancellationEmail } from "./templates/event-cancellation";

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = env.EMAIL_PROVIDER_API_KEY;
  const from = env.EMAIL_FROM_ADDRESS;

  if (!apiKey || !from) {
    console.warn("[email] EMAIL_PROVIDER_API_KEY or EMAIL_FROM_ADDRESS not set — skipping send");
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

export async function sendRsvpConfirmationEmail(params: {
  to: string;
  displayName: string;
  event: Event;
  appUrl: string;
}): Promise<void> {
  const { to, displayName, event, appUrl } = params;
  const { subject, text } = await generateRsvpConfirmationEmail(event, displayName, appUrl);
  await sendEmail({ to, subject, text });
}

export async function sendEventCancellationEmail(params: {
  to: string;
  displayName: string;
  event: Event;
}): Promise<void> {
  const { to, displayName, event } = params;
  const { subject, text } = buildEventCancellationEmail(event, displayName);
  await sendEmail({ to, subject, text });
}

import { z } from "zod";

/** Form fields for create/edit event (client form state). */
export const createEventFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be at most 100 characters"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:mm"),
  status: z.enum(["draft", "published"]),
  capacity: z.coerce
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .optional(),
});

export type CreateEventFormData = z.infer<typeof createEventFormSchema>;

/**
 * Payload sent to createEvent / updateEvent Server Action.
 * Client builds startsAt from date+time in local TZ.
 */
export const createEventActionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be at most 100 characters"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  startsAt: z.string().datetime(),
  status: z.enum(["draft", "published"]),
  capacity: z.coerce
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .optional(),
});

export type CreateEventActionPayload = z.infer<typeof createEventActionSchema>;

/** Server-side validation: same shape + future date check when publishing. */
export function validateCreateEventPayload(raw: unknown):
  | { success: true; data: CreateEventActionPayload }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> } {
  const parsed = createEventActionSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(flat.fieldErrors)) {
      if (Array.isArray(messages) && messages.length) fieldErrors[key] = messages;
    }
    return {
      success: false,
      error: flat.formErrors.join(" ") || "Invalid event data.",
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    };
  }
  const { data } = parsed;
  if (data.status === "published") {
    if (new Date(data.startsAt).getTime() <= Date.now()) {
      return {
        success: false,
        error: "Event date and time must be in the future when publishing.",
        fieldErrors: { startsAt: ["Must be in the future"] },
      };
    }
  }
  return { success: true, data };
}

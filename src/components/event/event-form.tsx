"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEventFormSchema } from "@/lib/validations/event.schema";
import { createEvent } from "@/lib/actions/event.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";

const TITLE_ID = "event-title";
const DESCRIPTION_ID = "event-description";
const LOCATION_ID = "event-location";
const DATE_ID = "event-date";
const TIME_ID = "event-time";
const FORM_ERROR_ID = "event-form-error";

type FieldErrors = Record<string, string[]>;

/**
 * Create-event form: title, description, location, date, time.
 * Client-side validation with Zod; server-side guard in createEvent.
 * Save as draft (optional) or Publish. Accessible: labels, aria-describedby, focus on first error.
 */
export function EventForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  function getFirstErrorElement(): HTMLElement | null {
    const order = [TITLE_ID, DESCRIPTION_ID, LOCATION_ID, DATE_ID, TIME_ID];
    for (const id of order) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function handleSubmit(status: "draft" | "published") {
    setSubmitError(null);
    setFieldErrors({});

    const formData = { title, description, location, date, time, status };
    const parsed = createEventFormSchema.safeParse(formData);

    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const errors: FieldErrors = {};
      for (const [key, messages] of Object.entries(flat.fieldErrors)) {
        if (Array.isArray(messages) && messages.length) errors[key] = messages;
      }
      setFieldErrors(errors);
      setSubmitError(parsed.error.flatten().formErrors.join(" ") || "Please fix the errors below.");
      startTransition(() => {
        getFirstErrorElement()?.focus();
      });
      return;
    }

    if (status === "published") {
      const startsAt = new Date(`${date}T${time}`);
      if (startsAt.getTime() <= Date.now()) {
        setFieldErrors({ date: ["Event date and time must be in the future when publishing."] });
        setSubmitError("Event date and time must be in the future when publishing.");
        getFirstErrorElement()?.focus();
        return;
      }
    }

    const startsAt = new Date(`${date}T${time}`).toISOString();
    const payload = { title, description, location, startsAt, status };

    startTransition(() => {
      createEvent(payload).then((result) => {
        if (result.ok) {
          router.push(`/dashboard/events/${result.data.eventId}`);
          return;
        }
        setSubmitError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        getFirstErrorElement()?.focus();
      });
    });
  }

  const err = (key: string) => fieldErrors[key]?.[0];
  const hasErrors = Object.keys(fieldErrors).length > 0 || submitError;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit("published");
      }}
      className="space-y-6"
      aria-describedby={hasErrors ? FORM_ERROR_ID : undefined}
    >
      {submitError && (
        <div id={FORM_ERROR_ID} role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span className="font-medium">Error:</span> {submitError}
        </div>
      )}

      <div>
        <label htmlFor={TITLE_ID} className="block text-sm font-medium text-neutral-700">
          Title
        </label>
        <Input
          id={TITLE_ID}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          className="mt-1"
          error={err("title")}
          errorId="event-title-error"
          autoComplete="off"
          maxLength={100}
          required
        />
        {err("title") && <FieldError id="event-title-error">{err("title")}</FieldError>}
      </div>

      <div>
        <label htmlFor={DESCRIPTION_ID} className="block text-sm font-medium text-neutral-700">
          Description
        </label>
        <Textarea
          id={DESCRIPTION_ID}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's the event about?"
          className="mt-1"
          error={err("description")}
          errorId="event-description-error"
          rows={4}
          required
        />
        {err("description") && <FieldError id="event-description-error">{err("description")}</FieldError>}
      </div>

      <div>
        <label htmlFor={LOCATION_ID} className="block text-sm font-medium text-neutral-700">
          Location
        </label>
        <Input
          id={LOCATION_ID}
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Address, venue, or “Online”"
          className="mt-1"
          error={err("location")}
          errorId="event-location-error"
          autoComplete="off"
          required
        />
        {err("location") && <FieldError id="event-location-error">{err("location")}</FieldError>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={DATE_ID} className="block text-sm font-medium text-neutral-700">
            Date
          </label>
          <Input
            id={DATE_ID}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1"
            error={err("date")}
            errorId="event-date-error"
            required
          />
          {err("date") && <FieldError id="event-date-error">{err("date")}</FieldError>}
        </div>
        <div>
          <label htmlFor={TIME_ID} className="block text-sm font-medium text-neutral-700">
            Time
          </label>
          <Input
            id={TIME_ID}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1"
            error={err("time")}
            errorId="event-time-error"
            required
          />
          {err("time") && <FieldError id="event-time-error">{err("time")}</FieldError>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          isLoading={isPending}
          loadingLabel="Creating event"
        >
          Publish event
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => handleSubmit("draft")}
          aria-label="Save as draft without publishing"
        >
          Save as draft
        </Button>
      </div>
    </form>
  );
}

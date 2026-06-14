"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEventFormSchema } from "@/lib/validations/event.schema";
import { updateEvent } from "@/lib/actions/event.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";

const TITLE_ID = "edit-event-title";
const DESCRIPTION_ID = "edit-event-description";
const LOCATION_ID = "edit-event-location";
const DATE_ID = "edit-event-date";
const TIME_ID = "edit-event-time";
const CAPACITY_ID = "edit-event-capacity";
const FORM_ERROR_ID = "edit-event-form-error";

type FieldErrors = Record<string, string[]>;

interface EditEventFormProps {
  eventId: string;
  initialTitle: string;
  initialDescription: string;
  initialLocation: string;
  initialDate: string;
  initialTime: string;
  initialStatus: "draft" | "published";
  initialCapacity: number | undefined;
}

export function EditEventForm({
  eventId,
  initialTitle,
  initialDescription,
  initialLocation,
  initialDate,
  initialTime,
  initialStatus,
  initialCapacity,
}: EditEventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [location, setLocation] = useState(initialLocation);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [capacity, setCapacity] = useState(
    initialCapacity !== undefined ? String(initialCapacity) : ""
  );

  function getFirstErrorElement(): HTMLElement | null {
    const order = [TITLE_ID, DESCRIPTION_ID, LOCATION_ID, DATE_ID, TIME_ID, CAPACITY_ID];
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
      setSubmitError(flat.formErrors.join(" ") || "Please fix the errors below.");
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
    const payload = {
      title,
      description,
      location,
      startsAt,
      status,
      ...(capacity !== "" ? { capacity: Number(capacity) } : {}),
    };

    startTransition(() => {
      updateEvent(eventId, payload).then((result) => {
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
        <div
          id={FORM_ERROR_ID}
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
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
          errorId="edit-event-title-error"
          autoComplete="off"
          maxLength={100}
          required
          disabled={isPending}
        />
        {err("title") && <FieldError id="edit-event-title-error">{err("title")}</FieldError>}
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
          errorId="edit-event-description-error"
          rows={4}
          required
          disabled={isPending}
        />
        {err("description") && (
          <FieldError id="edit-event-description-error">{err("description")}</FieldError>
        )}
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
          placeholder='Address, venue, or "Online"'
          className="mt-1"
          error={err("location")}
          errorId="edit-event-location-error"
          autoComplete="off"
          required
          disabled={isPending}
        />
        {err("location") && (
          <FieldError id="edit-event-location-error">{err("location")}</FieldError>
        )}
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
            errorId="edit-event-date-error"
            required
            disabled={isPending}
          />
          {err("date") && <FieldError id="edit-event-date-error">{err("date")}</FieldError>}
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
            errorId="edit-event-time-error"
            required
            disabled={isPending}
          />
          {err("time") && <FieldError id="edit-event-time-error">{err("time")}</FieldError>}
        </div>
      </div>

      <div>
        <label htmlFor={CAPACITY_ID} className="block text-sm font-medium text-neutral-700">
          Capacity{" "}
          <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <Input
          id={CAPACITY_ID}
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Leave blank for unlimited"
          className="mt-1"
          error={err("capacity")}
          errorId="edit-event-capacity-error"
          disabled={isPending}
        />
        {err("capacity") && (
          <FieldError id="edit-event-capacity-error">{err("capacity")}</FieldError>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" isLoading={isPending} loadingLabel="Saving event">
          Save &amp; publish
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
        <Button
          type="button"
          variant="ghost"
          disabled={isPending}
          onClick={() => router.push(`/dashboard/events/${eventId}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

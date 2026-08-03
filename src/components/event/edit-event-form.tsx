"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEventFormSchema, type CreateEventFormData } from "@/lib/validations/event.schema";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/types";
import { updateEvent } from "@/lib/actions/event.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";

const FORM_ERROR_ID = "edit-event-form-error";

interface EditEventFormProps {
  eventId: string;
  initialTitle: string;
  initialDescription: string;
  initialLocation: string;
  initialDate: string;
  initialTime: string;
  initialStatus: "draft" | "published";
  initialCapacity: number | undefined;
  initialVenueName: string | undefined;
  initialCategory: EventCategory | undefined;
  initialLat: number | undefined;
  initialLng: number | undefined;
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
  initialVenueName,
  initialCategory,
  initialLat,
  initialLng,
}: EditEventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      title: initialTitle,
      description: initialDescription,
      location: initialLocation,
      date: initialDate,
      time: initialTime,
      status: initialStatus,
      capacity: initialCapacity,
      venueName: initialVenueName,
      category: initialCategory,
      lat: initialLat,
      lng: initialLng,
    },
  });

  function onSubmit(data: CreateEventFormData) {
    if (data.status === "published") {
      const startsAt = new Date(`${data.date}T${data.time}`);
      if (startsAt.getTime() <= Date.now()) {
        setError("date", { message: "Event date and time must be in the future when publishing." });
        setError("root", { message: "Event date and time must be in the future when publishing." });
        return;
      }
    }

    const payload = {
      title: data.title,
      description: data.description,
      location: data.location,
      startsAt: new Date(`${data.date}T${data.time}`).toISOString(),
      status: data.status,
      ...(data.capacity != null ? { capacity: data.capacity } : {}),
      ...(data.venueName ? { venueName: data.venueName } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.lat != null ? { lat: data.lat } : {}),
      ...(data.lng != null ? { lng: data.lng } : {}),
    };

    startTransition(() => {
      updateEvent(eventId, payload).then((result) => {
        if (result.ok) {
          router.push(`/dashboard/events/${result.data.eventId}`);
          return;
        }
        setError("root", { message: result.error });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            setError(field as keyof CreateEventFormData, { message: (messages as string[])[0] });
          }
        }
      });
    });
  }

  function submitWithStatus(status: "draft" | "published") {
    setValue("status", status);
    void handleSubmit(onSubmit)();
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submitWithStatus("published");
      }}
      className="space-y-6"
      aria-describedby={errors.root ? FORM_ERROR_ID : undefined}
    >
      {errors.root && (
        <div
          id={FORM_ERROR_ID}
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          <span className="font-medium">Error:</span> {errors.root.message}
        </div>
      )}

      <div>
        <label htmlFor="edit-event-title" className="block text-sm font-medium text-neutral-700">
          Title
        </label>
        <Input
          id="edit-event-title"
          type="text"
          placeholder="Event title"
          className="mt-1"
          autoComplete="off"
          maxLength={100}
          required
          disabled={isPending}
          aria-describedby={errors.title ? "edit-event-title-error" : undefined}
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && <FieldError id="edit-event-title-error">{errors.title.message}</FieldError>}
      </div>

      <div>
        <label htmlFor="edit-event-description" className="block text-sm font-medium text-neutral-700">
          Description
        </label>
        <Textarea
          id="edit-event-description"
          placeholder="What's the event about?"
          className="mt-1"
          rows={4}
          required
          disabled={isPending}
          aria-describedby={errors.description ? "edit-event-description-error" : undefined}
          aria-invalid={!!errors.description}
          {...register("description")}
        />
        {errors.description && (
          <FieldError id="edit-event-description-error">{errors.description.message}</FieldError>
        )}
      </div>

      <div>
        <label htmlFor="edit-event-location" className="block text-sm font-medium text-neutral-700">
          Location
        </label>
        <Input
          id="edit-event-location"
          type="text"
          placeholder='Address, venue, or "Online"'
          className="mt-1"
          autoComplete="off"
          required
          disabled={isPending}
          aria-describedby={errors.location ? "edit-event-location-error" : undefined}
          aria-invalid={!!errors.location}
          {...register("location")}
        />
        {errors.location && (
          <FieldError id="edit-event-location-error">{errors.location.message}</FieldError>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-event-venue" className="block text-sm font-medium text-neutral-700">
            Venue <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <Input
            id="edit-event-venue"
            type="text"
            placeholder="e.g. Union Station"
            className="mt-1"
            autoComplete="off"
            maxLength={120}
            disabled={isPending}
            aria-describedby={errors.venueName ? "edit-event-venue-error" : undefined}
            aria-invalid={!!errors.venueName}
            {...register("venueName", { setValueAs: (v) => (v === "" ? undefined : v) })}
          />
          {errors.venueName && (
            <FieldError id="edit-event-venue-error">{errors.venueName.message}</FieldError>
          )}
        </div>
        <div>
          <label htmlFor="edit-event-category" className="block text-sm font-medium text-neutral-700">
            Category <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <select
            id="edit-event-category"
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            disabled={isPending}
            aria-describedby={errors.category ? "edit-event-category-error" : undefined}
            aria-invalid={!!errors.category}
            {...register("category", { setValueAs: (v) => (v === "" ? undefined : v) })}
          >
            <option value="">No category</option>
            {EVENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          {errors.category && (
            <FieldError id="edit-event-category-error">{errors.category.message}</FieldError>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-event-lat" className="block text-sm font-medium text-neutral-700">
            Latitude <span className="font-normal text-neutral-500">(optional, for map)</span>
          </label>
          <Input
            id="edit-event-lat"
            type="number"
            step="any"
            min={-90}
            max={90}
            placeholder="e.g. 39.7392"
            className="mt-1"
            disabled={isPending}
            aria-describedby={errors.lat ? "edit-event-lat-error" : undefined}
            aria-invalid={!!errors.lat}
            {...register("lat", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
          />
          {errors.lat && <FieldError id="edit-event-lat-error">{errors.lat.message}</FieldError>}
        </div>
        <div>
          <label htmlFor="edit-event-lng" className="block text-sm font-medium text-neutral-700">
            Longitude <span className="font-normal text-neutral-500">(optional, for map)</span>
          </label>
          <Input
            id="edit-event-lng"
            type="number"
            step="any"
            min={-180}
            max={180}
            placeholder="e.g. -104.9903"
            className="mt-1"
            disabled={isPending}
            aria-describedby={errors.lng ? "edit-event-lng-error" : undefined}
            aria-invalid={!!errors.lng}
            {...register("lng", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
          />
          {errors.lng && <FieldError id="edit-event-lng-error">{errors.lng.message}</FieldError>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-event-date" className="block text-sm font-medium text-neutral-700">
            Date
          </label>
          <Input
            id="edit-event-date"
            type="date"
            className="mt-1"
            required
            disabled={isPending}
            aria-describedby={errors.date ? "edit-event-date-error" : undefined}
            aria-invalid={!!errors.date}
            {...register("date")}
          />
          {errors.date && <FieldError id="edit-event-date-error">{errors.date.message}</FieldError>}
        </div>
        <div>
          <label htmlFor="edit-event-time" className="block text-sm font-medium text-neutral-700">
            Time
          </label>
          <Input
            id="edit-event-time"
            type="time"
            className="mt-1"
            required
            disabled={isPending}
            aria-describedby={errors.time ? "edit-event-time-error" : undefined}
            aria-invalid={!!errors.time}
            {...register("time")}
          />
          {errors.time && <FieldError id="edit-event-time-error">{errors.time.message}</FieldError>}
        </div>
      </div>

      <div>
        <label htmlFor="edit-event-capacity" className="block text-sm font-medium text-neutral-700">
          Capacity <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <Input
          id="edit-event-capacity"
          type="number"
          min={1}
          placeholder="Leave blank for unlimited"
          className="mt-1"
          disabled={isPending}
          aria-describedby={errors.capacity ? "edit-event-capacity-error" : undefined}
          aria-invalid={!!errors.capacity}
          {...register("capacity", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
        />
        {errors.capacity && (
          <FieldError id="edit-event-capacity-error">{errors.capacity.message}</FieldError>
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
          onClick={() => submitWithStatus("draft")}
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

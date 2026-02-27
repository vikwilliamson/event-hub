import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/**
 * MVP stub: public event detail. Replace with getEvent(organizerId, id) once
 * we have a way to resolve organizerId from event id (or use a flat event id in v1).
 */
export default async function EventPage({ params }: Props) {
  const { id } = await params;
  if (!id) notFound();
  return (
    <article>
      <h1 className="text-2xl font-bold text-neutral-900">Event</h1>
      <p className="mt-2 text-neutral-600">Event ID: {id}</p>
      <p className="mt-2 text-sm text-neutral-500">(Stub: wire to getEvent and event UI)</p>
    </article>
  );
}

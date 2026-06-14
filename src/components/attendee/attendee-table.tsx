import type { AttendeeInfo } from "@/lib/actions/rsvp.actions";

interface AttendeeTableProps {
  attendees: AttendeeInfo[];
}

export function AttendeeTable({ attendees }: AttendeeTableProps) {
  if (attendees.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 p-8 text-center">
        <p className="text-neutral-600">No confirmed attendees yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-neutral-700"
            >
              Attendee
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-neutral-700"
            >
              Email
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-neutral-700"
            >
              RSVP Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 bg-white">
          {attendees.map((attendee) => (
            <tr key={attendee.userId} className="hover:bg-neutral-50">
              <td className="px-4 py-3 text-neutral-900">
                {attendee.displayName ?? (
                  <span className="text-neutral-400 italic">No name set</span>
                )}
              </td>
              <td className="px-4 py-3 text-neutral-700">
                {attendee.email ?? (
                  <span className="text-neutral-400 italic">Unknown</span>
                )}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {attendee.rsvpDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

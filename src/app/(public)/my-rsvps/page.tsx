import Link from "next/link";

// Sample RSVP data for demo purposes (matches seeded database data)
const sampleRsvps = [
  {
    id: "rsvp-1",
    eventId: "react-summit-2024",
    eventTitle: "React Summit 2024",
    organizerName: "Tech Events Co",
    attendeeName: "Alice Johnson",
    attendeeEmail: "alice@example.com",
    status: "confirmed",
    createdAt: new Date("2024-05-15T10:00:00"),
    cancelledAt: null,
  },
  {
    id: "rsvp-2", 
    eventId: "react-summit-2024",
    eventTitle: "React Summit 2024",
    organizerName: "Tech Events Co",
    attendeeName: "Bob Smith",
    attendeeEmail: "bob@example.com",
    status: "confirmed",
    createdAt: new Date("2024-05-16T14:30:00"),
    cancelledAt: null,
  },
  {
    id: "rsvp-3",
    eventId: "javascript-workshop",
    eventTitle: "JavaScript Workshop", 
    organizerName: "Tech Events Co",
    attendeeName: "Carol Davis",
    attendeeEmail: "carol@example.com",
    status: "confirmed",
    createdAt: new Date("2024-06-01T09:15:00"),
    cancelledAt: null,
  },
  {
    id: "rsvp-4",
    eventId: "python-for-beginners",
    eventTitle: "Python for Beginners",
    organizerName: "Community Learning",
    attendeeName: "David Wilson", 
    attendeeEmail: "david@example.com",
    status: "confirmed",
    createdAt: new Date("2024-06-10T11:20:00"),
    cancelledAt: null,
  },
  {
    id: "rsvp-5",
    eventId: "web-dev-meetup",
    eventTitle: "Web Development Meetup",
    organizerName: "Tech Events Co",
    attendeeName: "Eva Brown",
    attendeeEmail: "eva@example.com",
    status: "cancelled",
    createdAt: new Date("2024-07-01T16:45:00"),
    cancelledAt: new Date("2024-11-15T10:30:00"),
  },
  {
    id: "rsvp-6",
    eventId: "design-systems-workshop",
    eventTitle: "Design Systems Workshop",
    organizerName: "Community Learning",
    attendeeName: "Frank Miller",
    attendeeEmail: "frank@example.com", 
    status: "confirmed",
    createdAt: new Date("2024-01-20T13:00:00"),
    cancelledAt: null,
  },
];

export default function MyRsvpsPage() {
  const confirmedRsvps = sampleRsvps.filter(rsvp => rsvp.status === "confirmed");
  const cancelledRsvps = sampleRsvps.filter(rsvp => rsvp.status === "cancelled");

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">My RSVPs</h1>
        <p className="text-lg text-neutral-600">
          Track your event registrations and attendance.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Total RSVPs</h3>
          <p className="text-3xl font-bold text-blue-600">{sampleRsvps.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Confirmed</h3>
          <p className="text-3xl font-bold text-green-600">{confirmedRsvps.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Cancelled</h3>
          <p className="text-3xl font-bold text-red-600">{cancelledRsvps.length}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-neutral-900">Your RSVPs</h2>
        <Link 
          href="/events"
          className="rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          Browse More Events
        </Link>
      </div>

      {sampleRsvps.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No RSVPs yet</h3>
          <p className="text-neutral-600 mb-6">
            You haven't registered for any events yet.
          </p>
          <Link 
            href="/events"
            className="rounded bg-neutral-900 px-6 py-3 text-white hover:bg-neutral-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Confirmed RSVPs */}
          {confirmedRsvps.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Confirmed RSVPs</h3>
              <div className="space-y-4">
                {confirmedRsvps.map((rsvp) => (
                  <div key={rsvp.id} className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-neutral-900">{rsvp.eventTitle}</h4>
                        <p className="text-sm text-neutral-600">{rsvp.organizerName}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        rsvp.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {rsvp.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-600">
                      <p><strong>Name:</strong> {rsvp.attendeeName}</p>
                      <p><strong>Email:</strong> {rsvp.attendeeEmail}</p>
                      <p><strong>RSVP Date:</strong> {rsvp.createdAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancelled RSVPs */}
          {cancelledRsvps.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Cancelled RSVPs</h3>
              <div className="space-y-4">
                {cancelledRsvps.map((rsvp) => (
                  <div key={rsvp.id} className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm opacity-75">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-neutral-900">{rsvp.eventTitle}</h4>
                        <p className="text-sm text-neutral-600">{rsvp.organizerName}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-red-100 text-red-800">
                        Cancelled
                      </span>
                    </div>
                    <div className="text-sm text-neutral-600">
                      <p><strong>Name:</strong> {rsvp.attendeeName}</p>
                      <p><strong>Email:</strong> {rsvp.attendeeEmail}</p>
                      <p><strong>RSVP Date:</strong> {rsvp.createdAt.toLocaleDateString()}</p>
                      <p><strong>Cancelled:</strong> {rsvp.cancelledAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

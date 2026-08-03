/**
 * Seed the local demo store with realistic events across several cities.
 * Run with `npm run seed`. Writes through the same JsonFileStore the app
 * uses, so `npm run dev` immediately shows the data. Re-running replaces
 * previously seeded events (they share stable ids) but leaves any events
 * or RSVPs you created in the UI untouched.
 */
import { getStore } from "../src/lib/store";
import type { Event, User } from "../src/lib/types";

const now = new Date();

const daysFromNow = (days: number, hour = 18): Date => {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const SEED_ORGANIZERS: User[] = [
  { id: "seed-org-mile-high", displayName: "Mile High Meetups", createdAt: now },
  { id: "seed-org-lonestar", displayName: "Lone Star Gatherings", createdAt: now },
  { id: "seed-org-pacific", displayName: "Pacific Events Collective", createdAt: now },
];

type SeedEvent = Pick<
  Event,
  "id" | "organizerId" | "title" | "description" | "location" | "venueName" | "lat" | "lng" | "category" | "capacity"
> & { startsAt: Date };

const SEED_EVENTS: SeedEvent[] = [
  {
    id: "seed-denver-typescript",
    organizerId: "seed-org-mile-high",
    title: "Denver TypeScript Meetup",
    description:
      "Monthly talks on TypeScript, Node, and the modern web. Two speakers, pizza, and lightning-round Q&A. All experience levels welcome.",
    location: "Denver, CO",
    venueName: "Union Station",
    lat: 39.7527,
    lng: -105.0003,
    category: "tech",
    capacity: 80,
    startsAt: daysFromNow(3),
  },
  {
    id: "seed-denver-food-fest",
    organizerId: "seed-org-mile-high",
    title: "RiNo Street Food Festival",
    description:
      "Twenty food trucks, local breweries, and live DJs across the River North Art District. Family friendly until 8pm.",
    location: "Denver, CO",
    venueName: "RiNo Art District",
    lat: 39.7621,
    lng: -104.9811,
    category: "food",
    capacity: null,
    startsAt: daysFromNow(9, 12),
  },
  {
    id: "seed-boulder-bluegrass",
    organizerId: "seed-org-mile-high",
    title: "Boulder Bluegrass Night",
    description:
      "Three local bands on the back porch of the historic Chautauqua dining hall. Bring a blanket; doors at sunset.",
    location: "Boulder, CO",
    venueName: "Chautauqua Park",
    lat: 39.9989,
    lng: -105.2831,
    category: "music",
    capacity: 150,
    startsAt: daysFromNow(6, 19),
  },
  {
    id: "seed-boulder-trail-run",
    organizerId: "seed-org-mile-high",
    title: "Sunrise Trail Run: Mount Sanitas",
    description:
      "A casual 5-mile group trail run up Mount Sanitas and back. Meet at the trailhead; all paces welcome, nobody runs alone.",
    location: "Boulder, CO",
    venueName: "Mount Sanitas Trailhead",
    lat: 40.0206,
    lng: -105.297,
    category: "outdoors",
    capacity: 25,
    startsAt: daysFromNow(2, 6),
  },
  {
    id: "seed-austin-taco-crawl",
    organizerId: "seed-org-lonestar",
    title: "East Austin Taco Crawl",
    description:
      "Five taquerias in two miles. We rank every al pastor taco scientifically. Cash recommended; walking shoes required.",
    location: "Austin, TX",
    venueName: "East 6th Street",
    lat: 30.2621,
    lng: -97.7222,
    category: "food",
    capacity: 30,
    startsAt: daysFromNow(5, 11),
  },
  {
    id: "seed-austin-startup-pitch",
    organizerId: "seed-org-lonestar",
    title: "Austin Startup Pitch Night",
    description:
      "Six early-stage founders, five minutes each, live audience feedback. Networking with investors and operators afterward.",
    location: "Austin, TX",
    venueName: "Capital Factory",
    lat: 30.2687,
    lng: -97.7405,
    category: "business",
    capacity: 120,
    startsAt: daysFromNow(12),
  },
  {
    id: "seed-austin-kayak",
    organizerId: "seed-org-lonestar",
    title: "Lady Bird Lake Kayak Social",
    description:
      "Rent a kayak or bring your own and paddle the lake at golden hour. We regroup at the bat bridge for the evening flight.",
    location: "Austin, TX",
    venueName: "Rowing Dock",
    lat: 30.2642,
    lng: -97.7675,
    category: "outdoors",
    capacity: 40,
    startsAt: daysFromNow(8, 17),
  },
  {
    id: "seed-sf-ai-builders",
    organizerId: "seed-org-pacific",
    title: "SF AI Builders Meetup",
    description:
      "Demos of what people are actually shipping with LLMs — no slideware. Three demos, then open floor. Doors 6pm, demos 6:30 sharp.",
    location: "San Francisco, CA",
    venueName: "SoMa Loft",
    lat: 37.7785,
    lng: -122.3968,
    category: "tech",
    capacity: 100,
    startsAt: daysFromNow(4),
  },
  {
    id: "seed-sf-gallery-walk",
    organizerId: "seed-org-pacific",
    title: "Mission District Gallery Walk",
    description:
      "A guided evening walk through five galleries and the murals of Balmy Alley, ending with tapas on Valencia Street.",
    location: "San Francisco, CA",
    venueName: "Balmy Alley",
    lat: 37.7522,
    lng: -122.4127,
    category: "arts",
    capacity: 20,
    startsAt: daysFromNow(10, 17),
  },
  {
    id: "seed-seattle-pickup-soccer",
    organizerId: "seed-org-pacific",
    title: "Green Lake Pickup Soccer",
    description:
      "Friendly 7v7 on the lower field. First 28 players get a game; everyone else gets subbed in. Rain or shine, obviously.",
    location: "Seattle, WA",
    venueName: "Green Lake Park",
    lat: 47.6815,
    lng: -122.3292,
    category: "sports",
    capacity: 28,
    startsAt: daysFromNow(1, 10),
  },
  {
    id: "seed-nyc-rooftop-jazz",
    organizerId: "seed-org-pacific",
    title: "Brooklyn Rooftop Jazz",
    description:
      "A quartet, a sunset over the Manhattan skyline, and a strictly enforced no-phones-during-sets rule. 21+.",
    location: "New York, NY",
    venueName: "Williamsburg Rooftop",
    lat: 40.7143,
    lng: -73.9614,
    category: "music",
    capacity: 60,
    startsAt: daysFromNow(7, 20),
  },
  {
    id: "seed-chicago-volunteer-day",
    organizerId: "seed-org-lonestar",
    title: "Lakefront Cleanup & Cookout",
    description:
      "Two hours of beach cleanup along the lakefront trail, then burgers on us. Gloves and bags provided; bring sunscreen.",
    location: "Chicago, IL",
    venueName: "Montrose Beach",
    lat: 41.9665,
    lng: -87.638,
    category: "community",
    capacity: null,
    startsAt: daysFromNow(11, 9),
  },
];

async function seed() {
  const store = getStore();

  await store.mutate((data) => {
    for (const organizer of SEED_ORGANIZERS) {
      data.users[organizer.id] ??= organizer;
    }

    for (const seedEvent of SEED_EVENTS) {
      const organizer = data.users[seedEvent.organizerId];
      const existing = data.events[seedEvent.id];
      data.events[seedEvent.id] = {
        ...seedEvent,
        organizerName: organizer.displayName,
        endsAt: null,
        rsvpCount: existing?.rsvpCount ?? 0,
        status: "published",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        cancelledAt: null,
        publishedAt: existing?.publishedAt ?? now,
      };
    }
  });

  const counts = await store.read((data) => ({
    events: Object.keys(data.events).length,
    users: Object.keys(data.users).length,
  }));
  console.log(
    `Seeded ${SEED_EVENTS.length} events (store now has ${counts.events} events, ${counts.users} users).`
  );
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

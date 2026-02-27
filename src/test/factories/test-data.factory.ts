import type { Event } from '@/lib/firebase/types';

// Simple faker-like functions without external dependencies
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
const generateWords = (count: number) => Array.from({ length: count }, () => 
  Math.random().toString(36).substring(2, 8)
).join(' ');
const generateParagraph = () => Array.from({ length: 20 }, () => 
  Math.random().toString(36).substring(2, 8)
).join(' ');
const generateEmail = () => `test-${generateId()}@example.com`;
const generateName = () => `${generateWords(1)} ${generateWords(1)}`;

export const createTestEvent = (overrides: Partial<Event> = {}): Event => ({
  id: generateId(),
  organizerId: generateId(),
  organizerName: generateName(),
  title: generateWords(3),
  description: generateParagraph(),
  location: generateWords(2),
  startsAt: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Random future date
  endsAt: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
  capacity: Math.floor(Math.random() * 90) + 10, // 10-100
  rsvpCount: 0,
  status: "published",
  createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Past week
  updatedAt: new Date(),
  cancelledAt: null,
  publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  ...overrides,
});

export const createTestUser = () => ({
  uid: generateId(),
  email: generateEmail(),
  displayName: generateName(),
});

export const seedTestDatabase = async () => {
  const { getAdminFirestore } = await import('@/lib/firebase/admin');
  const db = getAdminFirestore();
  const organizerId = generateId();
  
  // Create test organizer
  await db.collection("organizers").doc(organizerId).set({
    displayName: "Test Organizer",
  });
  
  // Seed events
  const events = Array.from({ length: 5 }, (_, i) => 
    createTestEvent({ 
      organizerId,
      title: `Test Event ${i + 1}`,
      startsAt: new Date(Date.now() + i * 24 * 60 * 60 * 1000), // Daily events
    })
  );
  
  for (const event of events) {
    await db
      .collection("organizers")
      .doc(organizerId)
      .collection("events")
      .doc(event.id)
      .set(event);
  }
  
  return { events, organizerId };
};

export const cleanupTestDatabase = async (organizerId: string) => {
  const { getAdminFirestore } = await import('@/lib/firebase/admin');
  const db = getAdminFirestore();
  
  // Delete all events for this organizer
  const eventsSnap = await db
    .collection("organizers")
    .doc(organizerId)
    .collection("events")
    .get();
  
  for (const doc of eventsSnap.docs) {
    await doc.ref.delete();
  }
  
  // Delete organizer
  await db.collection("organizers").doc(organizerId).delete();
};

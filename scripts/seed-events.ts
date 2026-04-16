// Load environment variables from .env.local BEFORE any other imports
import { config } from "dotenv";
config({ path: ".env.local" });

import { getAdminFirestore, getAdminAuth } from "../src/lib/firebase/admin";
import { eventConverter } from "../src/lib/firebase/converters";
import type { Event } from "../src/lib/firebase/types";
import { Timestamp } from "firebase-admin/firestore";

// Sample organizers first (following the data model hierarchy)
const sampleOrganizers = [
  {
    uid: "test_organizer_1",
    displayName: "Tech Events Co",
    email: "tech-events@example.com",
    eventCount: 4, // Will be updated automatically
  },
  {
    uid: "test_organizer_2", 
    displayName: "Community Learning",
    email: "community@example.com",
    eventCount: 2, // Will be updated automatically
  },
];

// Sample events for testing
const sampleEvents: Omit<Event, "id" | "createdAt" | "updatedAt">[] = [
  {
    organizerId: "test_organizer_1",
    organizerName: "Tech Events Co",
    title: "React Summit 2024",
    description: "Join us for the biggest React conference of the year! Learn about the latest React features, best practices, and network with other developers.\n\nTopics include:\n- React 18+ features\n- Performance optimization\n- Server components\n- Next.js integration\n- State management patterns",
    location: "Moscone Center, San Francisco, CA",
    startsAt: new Date("2024-06-15T09:00:00"),
    endsAt: new Date("2024-06-15T18:00:00"),
    capacity: 500,
    rsvpCount: 234,
    status: "published",
    cancelledAt: null,
    publishedAt: new Date("2024-05-01T10:00:00"),
  },
  {
    organizerId: "test_organizer_1",
    organizerName: "Tech Events Co",
    title: "JavaScript Workshop",
    description: "Hands-on workshop covering modern JavaScript ES6+ features. Perfect for intermediate developers looking to level up their skills.\n\nWhat you'll learn:\n- Destructuring and spread operators\n- Async/await patterns\n- Array methods and functional programming\n- Module systems and bundling\n- Debugging techniques",
    location: "Tech Hub, Austin, TX",
    startsAt: new Date("2024-07-20T18:00:00"),
    endsAt: new Date("2024-07-20T21:00:00"),
    capacity: 50,
    rsvpCount: 45,
    status: "published",
    cancelledAt: null,
    publishedAt: new Date("2024-06-01T10:00:00"),
  },
  {
    organizerId: "test_organizer_1",
    organizerName: "Tech Events Co",
    title: "Web Development Meetup",
    description: "Monthly meetup for web developers to share knowledge and network. This month's topic: Building scalable web applications with modern tools.\n\nAgenda:\n6:00 PM - Networking and pizza\n6:30 PM - Main presentation\n7:30 PM - Lightning talks\n8:00 PM - Open discussion",
    location: "WeWork, Downtown Seattle",
    startsAt: new Date("2024-08-10T18:00:00"),
    endsAt: null,
    capacity: 30,
    rsvpCount: 28,
    status: "published",
    cancelledAt: null,
    publishedAt: new Date("2024-07-15T10:00:00"),
  },
  {
    organizerId: "test_organizer_2",
    organizerName: "Community Learning",
    title: "Python for Beginners",
    description: "Start your coding journey with Python! This beginner-friendly workshop covers the fundamentals of programming.\n\nPerfect for:\n- Absolute beginners to coding\n- Students and career changers\n- Anyone curious about programming\n\nWe'll cover:\n- Variables and data types\n- Control flow and functions\n- Basic data structures\n- Simple projects and exercises",
    location: "Community Center, Portland, OR",
    startsAt: new Date("2024-09-05T14:00:00"),
    endsAt: new Date("2024-09-05T17:00:00"),
    capacity: 25,
    rsvpCount: 18,
    status: "published",
    cancelledAt: null,
    publishedAt: new Date("2024-08-01T10:00:00"),
  },
  {
    organizerId: "test_organizer_1",
    organizerName: "Tech Events Co",
    title: "Draft: AI Conference",
    description: "Exploring the future of artificial intelligence and machine learning. [This is a draft event for testing purposes]",
    location: "Convention Center, Las Vegas, NV",
    startsAt: new Date("2024-10-01T09:00:00"),
    endsAt: new Date("2024-10-03T17:00:00"),
    capacity: 1000,
    rsvpCount: 0,
    status: "draft",
    cancelledAt: null,
    publishedAt: null,
  },
  {
    organizerId: "test_organizer_2",
    organizerName: "Community Learning",
    title: "Past Event: Design Systems Workshop",
    description: "Learn how to build and maintain design systems for large applications. [This event has already happened]",
    location: "Design Studio, Brooklyn, NY",
    startsAt: new Date("2024-01-15T10:00:00"),
    endsAt: new Date("2024-01-15T16:00:00"),
    capacity: 40,
    rsvpCount: 38,
    status: "published",
    cancelledAt: null,
    publishedAt: new Date("2023-12-01T10:00:00"),
  },
];

async function seedEvents() {
  console.log("🌱 Seeding events database...");
  
  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const now = new Date();
  
  try {
    // First, create organizer documents (following the data model)
    console.log("📝 Creating organizer documents...");
    for (const organizer of sampleOrganizers) {
      const organizerRef = db.collection("organizers").doc(organizer.uid);
      await organizerRef.set({
        uid: organizer.uid,
        displayName: organizer.displayName,
        email: organizer.email,
        eventCount: organizer.eventCount,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
      console.log(`✅ Created organizer: ${organizer.displayName}`);
    }
    
    // Then create events under each organizer
    console.log("📅 Creating event documents...");
    for (const eventData of sampleEvents) {
      // Get reference to the organizer's events collection
      const eventsRef = db
        .collection("organizers")
        .doc(eventData.organizerId)
        .collection("events")
        .withConverter(eventConverter);
      
      // Create document with auto-generated ID
      const docRef = eventsRef.doc();
      
      // Create the full event object
      const event: Event = {
        ...eventData,
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
      };
      
      await docRef.set(event);
      console.log(`✅ Created event: ${event.title} (${event.status})`);
    }
    
    console.log("🎉 Seeding complete!");
    console.log(`\n📊 Summary:`);
    console.log(`- ${sampleOrganizers.length} organizers created`);
    console.log(`- ${sampleEvents.length} events created`);
    console.log(`- ${sampleEvents.filter(e => e.status === 'published').length} published events`);
    console.log(`- ${sampleEvents.filter(e => e.status === 'draft').length} draft events`);
    
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run the seeding function
seedEvents().catch(console.error);

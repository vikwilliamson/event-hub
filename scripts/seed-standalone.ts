// Standalone seeding script that doesn't trigger our environment validation
const admin = require('firebase-admin');
const crypto = require('crypto');

// Sample events for testing
const sampleEvents = [
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
  },
];

async function seedEvents() {
  console.log("🌱 Seeding events database...");
  
  // Initialize Firebase Admin directly without our modules
  const serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "test-project",
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "test@test.com", 
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY || "fake-key"
  };
  
  const db = admin.firestore();
  const now = new Date();
  
  try {
    // First create organizer docs
    console.log("📝 Creating organizer documents...");
    const organizersCollection = db.collection("organizers");
    
    await organizersCollection.doc("test_organizer_1").set({
      uid: "test_organizer_1",
      displayName: "Tech Events Co",
      email: "tech-events@example.com",
      eventCount: 4,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    });
    
    await organizersCollection.doc("test_organizer_2").set({
      uid: "test_organizer_2",
      displayName: "Community Learning", 
      email: "community@example.com",
      eventCount: 2,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    });
    
    console.log("✅ Created 2 organizer documents");
    
    // Then create events under each organizer
    console.log("📅 Creating event documents...");
    for (const eventData of sampleEvents) {
      const eventsRef = db
        .collection("organizers")
        .doc(eventData.organizerId)
        .collection("events");
      
      const docRef = eventsRef.doc();
      
      // Create event document following the data model structure
      const eventDoc = {
        // Content
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        
        // Scheduling
        startsAt: admin.firestore.Timestamp.fromDate(eventData.startsAt),
        endsAt: eventData.endsAt ? admin.firestore.Timestamp.fromDate(eventData.endsAt) : null,
        
        // Capacity
        capacity: eventData.capacity,
        rsvpCount: eventData.rsvpCount,
        
        // Status
        status: eventData.status,
        visibility: "public", // Always "public" in v1
        
        // Organizer display (denormalized)
        organizerId: eventData.organizerId,
        organizerName: eventData.organizerName,
        
        // Timestamps
        createdAt: admin.firestore.Timestamp.fromDate(now),
        updatedAt: admin.firestore.Timestamp.fromDate(now),
        cancelledAt: eventData.cancelledAt ? admin.firestore.Timestamp.fromDate(eventData.cancelledAt) : null,
        publishedAt: eventData.publishedAt ? admin.firestore.Timestamp.fromDate(eventData.publishedAt) : null,
      };
      
      await docRef.set(eventDoc);
      console.log(`✅ Created event: ${eventData.title} (${eventData.status})`);
    }
    
    console.log("🎉 Seeding complete!");
    console.log(`\n📊 Summary:`);
    console.log(`- 2 organizers created`);
    console.log(`- ${sampleEvents.length} events created`);
    console.log(`- ${sampleEvents.filter(e => e.status === 'published').length} published events`);
    console.log(`- ${sampleEvents.filter(e => e.status === 'draft').length} draft events`);
    console.log(`\n💡 Test users:`);
    console.log(`- test_organizer_1 (Tech Events Co)`);
    console.log(`- test_organizer_2 (Community Learning)`);
    
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    console.error("\n💡 Make sure your Firebase environment variables are set in .env.local");
    process.exit(1);
  }
}

// Run the seeding function
seedEvents().catch(console.error);

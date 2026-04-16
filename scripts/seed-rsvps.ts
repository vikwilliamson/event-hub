// Load environment variables from .env.local BEFORE any other imports
import { config } from "dotenv";
config({ path: ".env.local" });

const admin = require('firebase-admin');
const { Timestamp } = admin.firestore;

// Sample RSVPs for testing
const sampleRsvps = [
  {
    eventId: "react-summit-2024", // This should match one of the seeded event IDs
    organizerId: "test_organizer_1",
    attendeeName: "Alice Johnson",
    attendeeEmail: "alice@example.com",
    status: "confirmed",
    cancelToken: "demo-token-1",
    cancelTokenExpiresAt: new Date("2024-12-31T23:59:59"),
  },
  {
    eventId: "react-summit-2024",
    organizerId: "test_organizer_1", 
    attendeeName: "Bob Smith",
    attendeeEmail: "bob@example.com",
    status: "confirmed",
    cancelToken: "demo-token-2",
    cancelTokenExpiresAt: new Date("2024-12-31T23:59:59"),
  },
  {
    eventId: "javascript-workshop",
    organizerId: "test_organizer_1",
    attendeeName: "Carol Davis",
    attendeeEmail: "carol@example.com", 
    status: "confirmed",
    cancelToken: "demo-token-3",
    cancelTokenExpiresAt: new Date("2024-12-31T23:59:59"),
  },
  {
    eventId: "python-for-beginners",
    organizerId: "test_organizer_2",
    attendeeName: "David Wilson",
    attendeeEmail: "david@example.com",
    status: "confirmed", 
    cancelToken: "demo-token-4",
    cancelTokenExpiresAt: new Date("2024-12-31T23:59:59"),
  },
  {
    eventId: "web-dev-meetup",
    organizerId: "test_organizer_1",
    attendeeName: "Eva Brown",
    attendeeEmail: "eva@example.com",
    status: "cancelled",
    cancelToken: "demo-token-5",
    cancelTokenExpiresAt: new Date("2024-12-31T23:59:59"),
    cancelledAt: new Date("2024-11-15T10:30:00"),
  },
  {
    eventId: "design-systems-workshop",
    organizerId: "test_organizer_2", 
    attendeeName: "Frank Miller",
    attendeeEmail: "frank@example.com",
    status: "confirmed",
    cancelToken: "demo-token-6",
    cancelTokenExpiresAt: new Date("2024-12-31T23:59:59"),
  },
];

async function seedRsvps() {
  console.log("🌱 Seeding RSVPs database...");
  
  // Initialize Firebase Admin with environment variables
  const serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  };
  
  const db = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  }).firestore();
  
  const now = new Date();
  
  try {
    console.log("📝 Creating RSVP documents...");
    
    for (const rsvpData of sampleRsvps) {
      const rsvpsRef = db
        .collection("organizers")
        .doc(rsvpData.organizerId)
        .collection("events")
        .doc(rsvpData.eventId)
        .collection("rsvps");
      
      const docRef = rsvpsRef.doc();
      
      // Create RSVP document following the data model structure
      const rsvpDoc = {
        // Identity
        id: docRef.id,
        eventId: rsvpData.eventId,
        organizerId: rsvpData.organizerId,
        
        // Attendee
        attendeeName: rsvpData.attendeeName,
        attendeeEmail: rsvpData.attendeeEmail,
        
        // Cancel token
        cancelToken: rsvpData.cancelToken,
        cancelTokenExpiresAt: Timestamp.fromDate(rsvpData.cancelTokenExpiresAt),
        
        // Status
        status: rsvpData.status,
        
        // Timestamps
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        cancelledAt: rsvpData.cancelledAt ? Timestamp.fromDate(rsvpData.cancelledAt) : null,
      };
      
      await docRef.set(rsvpDoc);
      console.log(`✅ Created RSVP: ${rsvpData.attendeeName} for ${rsvpData.eventId} (${rsvpData.status})`);
    }
    
    console.log("🎉 RSVP seeding complete!");
    console.log(`\n📊 Summary:`);
    console.log(`- ${sampleRsvps.length} RSVPs created`);
    console.log(`- ${sampleRsvps.filter(r => r.status === 'confirmed').length} confirmed RSVPs`);
    console.log(`- ${sampleRsvps.filter(r => r.status === 'cancelled').length} cancelled RSVPs`);
    console.log(`\n💡 Sample RSVPs for demo:`);
    console.log(`- Alice Johnson (confirmed) - React Summit`);
    console.log(`- Bob Smith (confirmed) - React Summit`);
    console.log(`- Carol Davis (confirmed) - JavaScript Workshop`);
    console.log(`- David Wilson (confirmed) - Python for Beginners`);
    console.log(`- Eva Brown (cancelled) - Web Dev Meetup`);
    console.log(`- Frank Miller (confirmed) - Design Systems Workshop`);
    
  } catch (error) {
    console.error("❌ RSVP seeding failed:", error);
    console.error("\n💡 Make sure your Firebase environment variables are set in .env.local");
    process.exit(1);
  }
}

// Run the seeding function
seedRsvps().catch(console.error);

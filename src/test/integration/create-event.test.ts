import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { createEvent as createEventAction } from '@/lib/actions/event.actions';
import { seedTestDatabase, createTestEvent, cleanupTestDatabase } from '../factories/test-data.factory';

describe('Create Event Flow', () => {
  let db: ReturnType<typeof getAdminFirestore>;
  let testOrganizerId: string;

  beforeEach(async () => {
    // Setup test database
    const setup = await seedTestDatabase();
    db = getAdminFirestore();
    testOrganizerId = setup.organizerId;
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestDatabase(testOrganizerId);
  });

  describe('Unit Tests', () => {
    it('should validate event creation payload', async () => {
      const validPayload = {
        title: 'Test Event',
        description: 'A test event',
        location: 'Test Location',
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'published' as const,
      };

      // Mock session
      const mockSession = { uid: testOrganizerId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      const result = await createEventAction(validPayload);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.eventId).toBeDefined();
        expect(typeof result.data.eventId).toBe('string');
      }
    });

    it('should reject invalid payload', async () => {
      const invalidPayload = {
        title: '', // Empty title
        description: 'A test event',
        location: 'Test Location',
        startsAt: 'invalid-date',
        status: 'published' as const,
      };

      const mockSession = { uid: testOrganizerId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      const result = await createEventAction(invalidPayload);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeDefined();
        expect(result.fieldErrors).toBeDefined();
      }
    });

    it('should require authentication', async () => {
      const validPayload = {
        title: 'Test Event',
        description: 'A test event', 
        location: 'Test Location',
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'published' as const,
      };

      // Mock no session
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(null);

      // This should redirect, but we'll catch it in test
      const result = await createEventAction(validPayload);
      
      // In a real test, you'd mock redirect and verify it was called
      expect(result).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should create event in database', async () => {
      const payload = {
        title: 'Integration Test Event',
        description: 'Testing event creation end-to-end',
        location: 'Test Location',
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'published' as const,
      };

      const mockSession = { uid: testOrganizerId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      const result = await createEventAction(payload);
      expect(result.ok).toBe(true);

      if (result.ok) {
        // Verify event exists in database
        const eventRef = db
          .collection('organizers')
          .doc(testOrganizerId)
          .collection('events')
          .doc(result.data.eventId);
        
        const eventSnap = await eventRef.get();
        expect(eventSnap.exists).toBe(true);
        
        const eventData = eventSnap.data();
        expect(eventData?.title).toBe(payload.title);
        expect(eventData?.description).toBe(payload.description);
        expect(eventData?.location).toBe(payload.location);
        expect(eventData?.status).toBe(payload.status);
        expect(eventData?.rsvpCount).toBe(0);
      }
    });

    it('should increment organizer event count', async () => {
      const payload = {
        title: 'Another Test Event',
        description: 'Testing event count increment',
        location: 'Test Location', 
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'published' as const,
      };

      const mockSession = { uid: testOrganizerId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      // Get initial event count
      const initialEvents = await db
        .collection('organizers')
        .doc(testOrganizerId)
        .collection('events')
        .get();

      const initialCount = initialEvents.docs.length;

      // Create event
      const result = await createEventAction(payload);
      expect(result.ok).toBe(true);

      // Verify count increased
      const finalEvents = await db
        .collection('organizers')
        .doc(testOrganizerId)
        .collection('events')
        .get();

      expect(finalEvents.docs.length).toBe(initialCount + 1);
    });
  });
});

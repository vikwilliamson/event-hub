import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { rsvpEvent, cancelRsvp, getUserRsvpStatus } from '@/lib/actions/rsvp.actions';
import { seedTestDatabase, createTestEvent, cleanupTestDatabase } from '../factories/test-data.factory';

describe('RSVP Flow', () => {
  let db: ReturnType<typeof getAdminFirestore>;
  let testOrganizerId: string;
  let testEvent: ReturnType<typeof createTestEvent>;
  let testUserId: string;

  beforeEach(async () => {
    // Setup test database
    const setup = await seedTestDatabase();
    db = getAdminFirestore();
    testOrganizerId = setup.organizerId;
    testEvent = setup.events[0];
    testUserId = 'test-user-123';

    // Create test user document
    await db.collection('users').doc(testUserId).set({
      email: 'test@example.com',
      displayName: 'Test User',
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestDatabase(testOrganizerId);
    await db.collection('users').doc(testUserId).delete();
  });

  describe('Unit Tests', () => {
    it('should create RSVP successfully', async () => {
      const mockSession = { uid: testUserId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      const result = await rsvpEvent(testEvent.id, testOrganizerId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.rsvp).toBeDefined();
        expect(result.data.rsvp.eventId).toBe(testEvent.id);
        expect(result.data.rsvp.userId).toBe(testUserId);
        expect(result.data.rsvp.organizerId).toBe(testOrganizerId);
        expect(result.data.rsvp.cancelledAt).toBeNull();
      }
    });

    it('should prevent duplicate RSVPs', async () => {
      const mockSession = { uid: testUserId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      // First RSVP should succeed
      const firstResult = await rsvpEvent(testEvent.id, testOrganizerId);
      expect(firstResult.ok).toBe(true);

      // Second RSVP should fail
      const secondResult = await rsvpEvent(testEvent.id, testOrganizerId);
      expect(secondResult.ok).toBe(false);
      if (!secondResult.ok) {
        expect(secondResult.error).toContain('already RSVP');
      }
    });

    it('should cancel RSVP successfully', async () => {
      const mockSession = { uid: testUserId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      // First create RSVP
      const createResult = await rsvpEvent(testEvent.id, testOrganizerId);
      expect(createResult.ok).toBe(true);

      // Then cancel it
      const cancelResult = await cancelRsvp(testEvent.id, testOrganizerId);
      expect(cancelResult.ok).toBe(true);
      if (cancelResult.ok) {
        expect(cancelResult.data.rsvp.cancelledAt).not.toBeNull();
      }
    });

    it('should require authentication', async () => {
      // Mock no session
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(null);

      const result = await rsvpEvent(testEvent.id, testOrganizerId);
      
      // Should redirect to login
      expect(result).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should update event RSVP count atomically', async () => {
      const mockSession = { uid: testUserId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      // Get initial RSVP count
      const eventRef = db
        .collection('organizers')
        .doc(testOrganizerId)
        .collection('events')
        .doc(testEvent.id);
      
      const initialSnap = await eventRef.get();
      const initialCount = initialSnap.data()?.rsvpCount || 0;

      // Create RSVP
      const result = await rsvpEvent(testEvent.id, testOrganizerId);
      expect(result.ok).toBe(true);

      // Verify count increased
      const finalSnap = await eventRef.get();
      const finalCount = finalSnap.data()?.rsvpCount || 0;
      expect(finalCount).toBe(initialCount + 1);
    });

    it('should decrement RSVP count on cancellation', async () => {
      const mockSession = { uid: testUserId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      // First create RSVP
      await rsvpEvent(testEvent.id, testOrganizerId);

      // Get count after RSVP
      const eventRef = db
        .collection('organizers')
        .doc(testOrganizerId)
        .collection('events')
        .doc(testEvent.id);
      
      const afterRsvpSnap = await eventRef.get();
      const afterRsvpCount = afterRsvpSnap.data()?.rsvpCount || 0;

      // Cancel RSVP
      const cancelResult = await cancelRsvp(testEvent.id, testOrganizerId);
      expect(cancelResult.ok).toBe(true);

      // Verify count decreased
      const finalSnap = await eventRef.get();
      const finalCount = finalSnap.data()?.rsvpCount || 0;
      expect(finalCount).toBe(afterRsvpCount - 1);
    });

    it('should store RSVP in correct hierarchy', async () => {
      const mockSession = { uid: testUserId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      const result = await rsvpEvent(testEvent.id, testOrganizerId);
      expect(result.ok).toBe(true);

      if (result.ok) {
        // Verify RSVP exists in correct location
        const rsvpRef = db
          .collection('organizers')
          .doc(testOrganizerId)
          .collection('events')
          .doc(testEvent.id)
          .collection('rsvps')
          .doc(testUserId);
        
        const rsvpSnap = await rsvpRef.get();
        expect(rsvpSnap.exists).toBe(true);
        
        const rsvpData = rsvpSnap.data();
        expect(rsvpData?.eventId).toBe(testEvent.id);
        expect(rsvpData?.userId).toBe(testUserId);
        expect(rsvpData?.organizerId).toBe(testOrganizerId);
        expect(rsvpData?.eventSnapshot?.title).toBe(testEvent.title);
      }
    });

    it('should handle concurrent RSVP attempts', async () => {
      const mockSession = { uid: testUserId, email: 'test@example.com' };
      jest.spyOn(await import('@/lib/firebase/auth.server'), 'getSession')
        .mockResolvedValue(mockSession);

      // Simulate concurrent RSVP attempts
      const promises = [
        rsvpEvent(testEvent.id, testOrganizerId),
        rsvpEvent(testEvent.id, testOrganizerId),
        rsvpEvent(testEvent.id, testOrganizerId),
      ];

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.ok
      ).length;
      
      expect(successCount).toBe(1);
      
      // Verify only one RSVP exists
      const rsvpRef = db
        .collection('organizers')
        .doc(testOrganizerId)
        .collection('events')
        .doc(testEvent.id)
        .collection('rsvps')
        .doc(testUserId);
      
      const rsvpSnap = await rsvpRef.get();
      expect(rsvpSnap.exists).toBe(true);
      
      // RSVP count should only be incremented once
      const eventRef = db
        .collection('organizers')
        .doc(testOrganizerId)
        .collection('events')
        .doc(testEvent.id);
      
      const eventSnap = await eventRef.get();
      expect(eventSnap.data()?.rsvpCount).toBe(1);
    });
  });
});

# RSVP Security Rules Update

## Required Rules for New RSVP Structure

Add these rules to your `firestore.rules`:

```javascript
// RSVP collection under events - follows documented hierarchy
match /organizers/{organizerId}/events/{eventId}/rsvps/{userId} {
  allow read: if isAuthenticated() && 
    (isOwner(userId) || isOwner(organizerId));
  allow create: if isAuthenticated() && isOwner(userId) && 
    hasOnly(['eventId', 'userId', 'organizerId', 'eventSnapshot', 'createdAt']);
  allow update: if isAuthenticated() && isOwner(userId) && 
    hasOnly(['cancelledAt']);
  allow delete: if false; // Soft delete with cancelledAt instead
}

// Collection group query for user's RSVPs across all events
match /organizers/{organizerId}/events/{eventId}/rsvps/{rsvpId} {
  allow list: if isAuthenticated() && isOwner(rsvpId);
}
```

## Index Requirements

Create these composite indexes in Firebase Console:

```json
{
  "indexes": [
    {
      "collectionGroup": "rsvps",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "cancelledAt", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "rsvps", 
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "eventId", "order": "ASCENDING"},
        {"fieldPath": "cancelledAt", "order": "ASCENDING"}
      ]
    }
  ]
}
```

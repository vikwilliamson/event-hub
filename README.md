# Event Hub

A modern event discovery and RSVP application built with Next.js 15, TypeScript, and Firebase. Event Hub allows users to discover events, RSVP to attend, and organizers to manage their events seamlessly.

## Features

- **Event Discovery**: Browse upcoming and past events with intuitive filtering
- **RSVP Management**: Users can RSVP to events and manage their attendance
- **Organizer Dashboard**: Event organizers can create, edit, and manage their events
- **Real-time Updates**: Live RSVP counts and event status updates
- **Responsive Design**: Mobile-first design with accessibility in mind
- **Secure Authentication**: Firebase-based authentication with proper session management
- **Type Safety**: Full TypeScript implementation with Zod validation

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Firebase Admin SDK
- **Database**: Firestore with optimized queries and security rules
- **Authentication**: Firebase Auth with email/password
- **Validation**: Zod schemas for type-safe data validation
- **Testing**: Jest, Playwright for E2E testing
- **Deployment**: Vercel-ready with environment configuration

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (for production deployment)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/event-hub.git
cd event-hub
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication with Email/Password provider
   - Create a Firestore Database
   - Generate a service account private key
   - Fill in your `.env.local` with the Firebase configuration

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Firebase Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (server-only)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional
SESSION_COOKIE_NAME=session
```

## Project Structure

```
src/
  app/                 # Next.js app router pages
    (auth)/           # Authentication routes
    (public)/         # Public event pages
    (organizer)/      # Organizer dashboard
    api/              # API routes
  components/         # Reusable React components
    auth/            # Authentication components
    event/           # Event-related components
    ui/              # Base UI components
  lib/               # Utility libraries
    actions/         # Server actions
    firebase/        # Firebase configuration
    validations/     # Zod schemas
  hooks/             # Custom React hooks
  test/              # Test files
```

## Database Schema

The application uses Firestore with the following structure:

```
organizers/
  {organizerId}/
    events/
      {eventId}/
        title: string
        description: string
        location: string
        startsAt: Date
        endsAt?: Date
        capacity?: number
        status: "published" | "draft" | "cancelled"
        rsvpCount: number
        organizerId: string
        organizerName: string
        createdAt: Date
        updatedAt: Date
        publishedAt?: Date
        cancelledAt?: Date
    rsvps/
      {userId}/
        eventId: string
        userId: string
        organizerId: string
        createdAt: Date
        cancelledAt?: Date
```

## Key Features & Optimizations

- **Optimized Queries**: Uses Firestore collection group queries to avoid N+1 problems
- **Caching**: In-memory caching for RSVP status to reduce database calls
- **Error Boundaries**: Comprehensive error handling with user-friendly fallbacks
- **Loading States**: Proper loading and empty states throughout the application
- **Accessibility**: ARIA labels, semantic HTML, and keyboard navigation
- **Type Safety**: End-to-end TypeScript with Zod runtime validation

## Testing

Run the test suite:

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Accessibility tests
npm run test:a11y
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_ADMIN_PROJECT_ID`
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
COPY . .
RUN npm run build

FROM base AS runner
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup for Production

1. **Firebase Configuration**:
   - Ensure your Firebase project is in production mode
   - Configure proper security rules
   - Set up Firestore indexes for query optimization

2. **Domain Configuration**:
   - Add authorized domains in Firebase Auth
   - Configure CORS if needed
   - Set up SSL certificates

3. **Monitoring**:
   - Enable Firebase monitoring
   - Set up error reporting
   - Configure performance monitoring

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Authentication by [Firebase](https://firebase.google.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

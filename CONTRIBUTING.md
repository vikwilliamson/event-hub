# Contributing to Event Hub

Thank you for your interest in contributing to Event Hub! This document provides guidelines for contributors.

## Code of Conduct

Please be respectful and professional in all interactions. We're here to learn and build together.

## Development Workflow

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

1. Fork the repository
2. Clone your fork locally:
```bash
git clone https://github.com/yourusername/event-hub.git
cd event-hub
```

3. Install dependencies:
```bash
npm install
```

4. Set up environment variables:
```bash
cp .env.example .env.local
```
Fill in your Firebase configuration for development.

5. Start the development server:
```bash
npm run dev
```

## Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - New features
- `bugfix/bug-description` - Bug fixes
- `hotfix/urgent-fix` - Critical production fixes

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Follow the existing code style and patterns
- Write TypeScript with proper types
- Add tests for new functionality
- Update documentation if needed

### 3. Code Style

This project uses:
- TypeScript with strict mode
- ESLint with Next.js configuration
- Prettier for code formatting
- Tailwind CSS for styling

#### Guidelines

- Use descriptive variable and function names
- Add JSDoc comments for complex functions
- Follow React best practices
- Use semantic HTML5 elements
- Ensure accessibility (ARIA labels, keyboard navigation)

### 4. Testing

Run tests before committing:

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Unit tests
npm test

# E2E tests (if applicable)
npm run test:e2e
```

### 5. Commit Your Changes

Use conventional commit messages:

```
feat: add user profile page
fix: resolve RSVP button loading state
docs: update API documentation
style: format code with prettier
refactor: optimize database queries
test: add unit tests for event service
chore: update dependencies
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Open a Pull Request with:
- Clear description of changes
- Related issues (if any)
- Testing instructions
- Screenshots (if UI changes)

## Pull Request Process

1. **Review Requirements**
   - All tests pass
   - Code follows project style
   - Documentation is updated
   - No TypeScript errors

2. **Review Checklist**
   - [ ] Code is properly formatted
   - [ ] Tests are added/updated
   - [ ] Documentation is updated
   - [ ] Accessibility is considered
   - [ ] Performance impact is assessed

3. **Approval Process**
   - At least one review required
   - All CI checks must pass
   - Maintainer approval for merge

## Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)
- Screenshots if applicable

## Feature Requests

For new features:

- Open an issue with "Feature Request" label
- Describe the use case and benefit
- Consider implementation complexity
- Discuss with maintainers before starting

## Development Tips

### Firebase Development

- Use the Firebase emulator for local testing
- Test security rules in the emulator
- Be mindful of Firestore costs in production

### Performance

- Use collection group queries for efficiency
- Implement proper caching strategies
- Optimize bundle size with dynamic imports

### Accessibility

- Test with screen readers
- Ensure keyboard navigation
- Use semantic HTML elements
- Add proper ARIA labels

## Getting Help

- Check existing issues and documentation
- Ask questions in GitHub discussions
- Join our development community

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

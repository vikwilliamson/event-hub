import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { RsvpButton } from '@/components/event/rsvp-button';
import { createTestUser } from '../factories/test-data.factory';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the RSVP hook
jest.mock('@/hooks/use-rsvp', () => ({
  useRsvp: jest.fn(),
}));

describe('RsvpButton Accessibility', () => {
  const mockProps = {
    eventId: 'test-event-id',
    organizerId: 'test-organizer-id',
  };

  it('should have no accessibility violations in loading state', async () => {
    const { useRsvp } = require('@/hooks/use-rsvp');
    useRsvp.mockReturnValue({
      status: 'loading',
      isRsvped: false,
      isLoading: true,
      error: null,
      rsvp: jest.fn(),
      cancel: jest.fn(),
      toggle: jest.fn(),
    });

    const { container } = render(<RsvpButton {...mockProps} />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when unauthenticated', async () => {
    const { useRsvp } = require('@/hooks/use-rsvp');
    useRsvp.mockReturnValue({
      status: 'unauthenticated',
      isRsvped: false,
      isLoading: false,
      error: null,
      rsvp: jest.fn(),
      cancel: jest.fn(),
      toggle: jest.fn(),
    });

    const { container } = render(<RsvpButton {...mockProps} />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in RSVP state', async () => {
    const { useRsvp } = require('@/hooks/use-rsvp');
    useRsvp.mockReturnValue({
      status: 'authenticated',
      isRsvped: false,
      isLoading: false,
      error: null,
      rsvp: jest.fn(),
      cancel: jest.fn(),
      toggle: jest.fn(),
    });

    const { container } = render(<RsvpButton {...mockProps} />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in Going state', async () => {
    const { useRsvp } = require('@/hooks/use-rsvp');
    useRsvp.mockReturnValue({
      status: 'authenticated',
      isRsvped: true,
      isLoading: false,
      error: null,
      rsvp: jest.fn(),
      cancel: jest.fn(),
      toggle: jest.fn(),
    });

    const { container } = render(<RsvpButton {...mockProps} />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA attributes', () => {
    const { useRsvp } = require('@/hooks/use-rsvp');
    useRsvp.mockReturnValue({
      status: 'authenticated',
      isRsvped: false,
      isLoading: false,
      error: null,
      rsvp: jest.fn(),
      cancel: jest.fn(),
      toggle: jest.fn(),
    });

    render(<RsvpButton {...mockProps} />);
    
    const rsvpButton = screen.getByRole('button', { name: /RSVP to this event/i });
    
    expect(rsvpButton).toHaveAttribute('aria-pressed', 'false');
    expect(rsvpButton).toHaveAttribute('aria-label', 'RSVP to this event');
  });

  it('should have proper ARIA attributes in Going state', () => {
    const { useRsvp } = require('@/hooks/use-rsvp');
    useRsvp.mockReturnValue({
      status: 'authenticated',
      isRsvped: true,
      isLoading: false,
      error: null,
      rsvp: jest.fn(),
      cancel: jest.fn(),
      toggle: jest.fn(),
    });

    render(<RsvpButton {...mockProps} />);
    
    const goingButton = screen.getByRole('button', { name: /You are going to this event/i });
    const cancelButton = screen.getByRole('button', { name: /Cancel RSVP/i });
    
    expect(goingButton).toHaveAttribute('aria-pressed', 'true');
    expect(goingButton).toHaveAttribute('aria-label', 'You are going to this event');
    expect(cancelButton).toHaveAttribute('aria-label', 'Cancel RSVP');
  });

  it('should announce loading state to screen readers', () => {
    const { useRsvp } = require('@/hooks/use-rsvp');
    useRsvp.mockReturnValue({
      status: 'loading',
      isRsvped: false,
      isLoading: true,
      error: null,
      rsvp: jest.fn(),
      cancel: jest.fn(),
      toggle: jest.fn(),
    });

    render(<RsvpButton {...mockProps} />);
    
    const loadingButton = screen.getByRole('button', { name: /Loading RSVP status/i });
    
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(loadingButton).toHaveAttribute('aria-live', 'polite');
  });

  it('should handle error states accessibly', async () => {
    const { useRsvp } = require('@/hooks/use-rsvp');
    useRsvp.mockReturnValue({
      status: 'error',
      isRsvped: false,
      isLoading: false,
      error: 'Network error',
      rsvp: jest.fn(),
      cancel: jest.fn(),
      toggle: jest.fn(),
    });

    const { container } = render(<RsvpButton {...mockProps} />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
    
    const errorButton = screen.getByRole('button', { name: /RSVP unavailable/i });
    expect(errorButton).toBeDisabled();
  });
});

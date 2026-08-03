// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { RsvpButton } from "@/components/event/rsvp-button";

const { mockUseRsvp } = vi.hoisted(() => ({ mockUseRsvp: vi.fn() }));
vi.mock("@/hooks/use-rsvp", () => ({ useRsvp: mockUseRsvp }));

const mockProps = {
  eventId: "test-event-id",
  organizerId: "test-organizer-id",
};

const makeRsvpState = (overrides = {}) => ({
  isRsvped: false,
  isLoading: false,
  error: null,
  rsvp: vi.fn(),
  cancel: vi.fn(),
  toggle: vi.fn(),
  ...overrides,
});

describe("RsvpButton Accessibility", () => {
  beforeEach(() => {
    mockUseRsvp.mockReset();
  });

  async function assertNoViolations(container: Element) {
    const results = await axe.run(container as HTMLElement);
    expect(results.violations).toHaveLength(0);
  }

  it("should have no accessibility violations in RSVP state", async () => {
    mockUseRsvp.mockReturnValue(makeRsvpState());
    const { container } = render(<RsvpButton {...mockProps} />);
    await assertNoViolations(container);
  });

  it("should have no accessibility violations in Going state", async () => {
    mockUseRsvp.mockReturnValue(makeRsvpState({ isRsvped: true }));
    const { container } = render(<RsvpButton {...mockProps} />);
    await assertNoViolations(container);
  });

  it("should have proper ARIA attributes", () => {
    mockUseRsvp.mockReturnValue(makeRsvpState());
    render(<RsvpButton {...mockProps} />);
    const rsvpButton = screen.getByRole("button", { name: /RSVP to this event/i });
    expect(rsvpButton).toHaveAttribute("aria-pressed", "false");
    expect(rsvpButton).toHaveAttribute("aria-label", "RSVP to this event");
  });

  it("should have proper ARIA attributes in Going state", () => {
    mockUseRsvp.mockReturnValue(makeRsvpState({ isRsvped: true }));
    render(<RsvpButton {...mockProps} />);
    const goingButton = screen.getByRole("button", { name: /You are going to this event/i });
    const cancelButton = screen.getByRole("button", { name: /Cancel RSVP/i });
    expect(goingButton).toHaveAttribute("aria-pressed", "true");
    expect(cancelButton).toHaveAttribute("aria-label", "Cancel RSVP");
  });

  it("should announce errors via a live region", async () => {
    mockUseRsvp.mockReturnValue(makeRsvpState({ error: "This event is at capacity." }));
    const { container } = render(<RsvpButton {...mockProps} />);
    await assertNoViolations(container);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/at capacity/i);
  });

  it("should disable the button while an action is in flight", () => {
    mockUseRsvp.mockReturnValue(makeRsvpState({ isLoading: true }));
    render(<RsvpButton {...mockProps} />);
    const button = screen.getByRole("button", { name: /RSVP/i });
    expect(button).toBeDisabled();
  });
});

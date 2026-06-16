// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { RsvpButton } from "@/components/event/rsvp-button";

const mockUseRsvp = vi.fn();
vi.mock("@/hooks/use-rsvp", () => ({ useRsvp: mockUseRsvp }));

const mockProps = {
  eventId: "test-event-id",
  organizerId: "test-organizer-id",
};

const makeRsvpState = (overrides = {}) => ({
  status: "authenticated",
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

  it("should have no accessibility violations in loading state", async () => {
    mockUseRsvp.mockReturnValue(makeRsvpState({ status: "loading", isLoading: true }));
    const { container } = render(<RsvpButton {...mockProps} />);
    await assertNoViolations(container);
  });

  it("should have no accessibility violations when unauthenticated", async () => {
    mockUseRsvp.mockReturnValue(makeRsvpState({ status: "unauthenticated" }));
    const { container } = render(<RsvpButton {...mockProps} />);
    await assertNoViolations(container);
  });

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

  it("should announce loading state to screen readers", () => {
    mockUseRsvp.mockReturnValue(makeRsvpState({ status: "loading", isLoading: true }));
    render(<RsvpButton {...mockProps} />);
    const loadingButton = screen.getByRole("button", { name: /Loading RSVP status/i });
    expect(loadingButton).toHaveAttribute("aria-busy", "true");
  });

  it("should handle error states accessibly", async () => {
    mockUseRsvp.mockReturnValue(makeRsvpState({ status: "error", error: "Network error" }));
    const { container } = render(<RsvpButton {...mockProps} />);
    await assertNoViolations(container);
    const errorButton = screen.getByRole("button", { name: /RSVP unavailable/i });
    expect(errorButton).toBeDisabled();
  });
});

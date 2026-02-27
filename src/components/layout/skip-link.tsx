"use client";

import Link from "next/link";

/**
 * Skip link: first focusable element, visible on focus. Jumps to main content.
 * WCAG 2.4.1 Bypass Blocks (Level A). Place at the very start of the layout.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-900"
    >
      Skip to main content
    </a>
  );
}

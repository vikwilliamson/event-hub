# EventHub Manual Accessibility Testing Checklist

## 🤖 Full Automated axe-core Audit — 2026-08-06

**Result: PASS — 0 violations.** Ran `@axe-core/playwright` with the **full WCAG 2.0/2.1 A & AA ruleset plus best-practices and color-contrast** (`withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","best-practice"])`) across every key route — `/`, `/events`, an event detail page, `/my-rsvps`, `/dashboard`, `/dashboard/events/new` — and the create form in its validation-error state. Zero violations of any impact.

Getting to zero fixed three real issues found along the way (all committed): the toast region's `aria-label` on a role-less div (→ `role="status"`), and an h1→h3 heading skip on both `/dashboard` and `/my-rsvps` (→ an sr-only `h2` "Overview"). The permanent `src/test/e2e/accessibility.spec.ts` now scans all six routes on every E2E run (color-contrast excluded there and covered by the dedicated audit below).

---

## 🎨 Color-Contrast Audit (TASK-29) — 2026-08-03

**Result: PASS.** All demo routes meet WCAG 2.1 AA contrast; no failures found, no fixes required.

**Method.** `@axe-core/playwright` was run with *only* the `color-contrast` rule enabled against `/`, `/events`, an event detail page, `/dashboard`, and `/dashboard/events/new` (the demo replaced `/login` and `/register` with the demo identity, so those routes from the original TASK-29 scope no longer exist). Because axe only scans text that is actually rendered over a detectable solid background, the transient status colors the palette uses in error/badge states (amber/red/green) were also checked directly by computing WCAG contrast ratios from the Tailwind palette hex values.

**axe scan:** 0 color-contrast violations on all five routes.

**Computed ratios for the palette's flagged pairs** (AA threshold: 4.5:1 normal text, 3:1 large text ≥24px or ≥18.66px bold):

| Foreground / background | Ratio | Context | Verdict |
|---|---|---|---|
| `amber-700` on white | 5.02:1 | form "draft with AI" status message | AA pass |
| `red-700` on white | 6.47:1 | inline RSVP error | AA pass |
| `red-800` on `red-100` | 6.80:1 | cancelled/confirmed badge (xs) | AA pass |
| `red-800` on `red-50` | 7.60:1 | form root error | AA pass |
| `green-800` on `green-100` | 6.49:1 | confirmed badge (xs) | AA pass |
| `red-600` on white | 4.83:1 | field/my-rsvps error | AA pass |
| `neutral-500` on white | 4.74:1 | "(optional)" field labels | AA pass |
| `neutral-600` on white | 7.81:1 | body copy | AA pass |
| `neutral-600` on `neutral-50` | 7.49:1 | search-form copy on tinted bg | AA pass |
| `neutral-700` on `neutral-100` | 9.51:1 | distance badge (xs) | AA pass |
| `blue-600` on white | 5.17:1 | stat number (3xl bold) | AA pass |
| `purple-600` on white | 5.38:1 | stat number (3xl bold) | AA pass |
| `green-600` on white | 3.30:1 | stat number (3xl bold) | AA pass **as large text** |

**One thing to know:** the `green-600` stat number ("Published" on `/dashboard`, "Confirmed" on `/my-rsvps`) is 3.30:1 on white — below the 4.5:1 normal-text bar but above the 3:1 large-text bar, and it is only ever rendered at `text-3xl font-bold` (30px bold), so it qualifies as large text and passes AA. It is the only pair relying on the large-text exemption; if any future use puts `green-600` on smaller text, bump it to `green-700` (5.0:1 on white).

Two unrelated ARIA violations surfaced by the (separate) axe scans during this work were fixed alongside: `role="status"` added to the toast region, and an sr-only `h2` added to the dashboard to fix heading order. See `docs/task-breakdown.md` §8.

---

## 🔧 Setup Instructions

### Screen Reader Setup
- **VoiceOver (Mac)**: Cmd + F5, Cmd + Fn + F5
- **NVDA (Windows)**: Download from nvaccess.org
- **JAWS (Windows)**: Commercial, 40-minute mode available
- **ChromeVox**: Built into Chrome OS, extension for other platforms

### Testing Tools
- **Browser**: Chrome, Firefox, Safari, Edge
- **Screen Reader**: VoiceOver + NVDA recommended
- **Keyboard**: Standard keyboard, no mouse
- **Color Blindness Simulator**: Chrome extension or online tools

---

## ⌨️ Keyboard Navigation Checklist

### **Tab Order & Focus Management**
- [ ] Tab moves through all interactive elements in logical order
- [ ] Focus is clearly visible (outline, high contrast)
- [ ] No keyboard traps (can tab in and out of all components)
- [ ] Skip navigation link works (if present)
- [ ] Modal dialogs trap focus correctly
- [ ] Focus returns to trigger after modal closes

### **RSVP Button Keyboard Testing**
- [ ] Tab reaches RSVP button
- [ ] Enter/Space activates RSVP button
- [ ] Button shows loading state via `aria-busy`
- [ ] State change announced to screen reader
- [ ] "Going" state keyboard accessible
- [ ] Cancel button keyboard accessible
- [ ] Focus management between Going/Cancel buttons

### **Form Navigation**
- [ ] All form fields reachable via Tab
- [ ] Labels properly associated with inputs
- [ ] Error messages announced when fields invalid
- [ ] Submit button disabled until valid (if applicable)
- [ ] Form submission feedback accessible

### **Event Cards Keyboard Testing**
- [ ] Event title links keyboard accessible
- [ ] RSVP buttons in cards keyboard accessible
- [ ] View details links keyboard accessible
- [ ] Card content readable via screen reader

### **Navigation Menu**
- [ ] All menu items keyboard accessible
- [ ] Mobile menu toggle keyboard accessible
- [ ] Dropdown/submenu navigation works
- [ ] Current page indication accessible

---

## 🖥️ Screen Reader Testing Checklist

### **Page Structure & Semantics**
- [ ] Page title descriptive and unique
- [ ] Proper heading hierarchy (h1, h2, h3...)
- [ ] Landmarks properly used (header, nav, main, footer)
- [ ] Lists used for grouped content
- [ ] Language attribute set correctly

### **RSVP Functionality Screen Reader**
- [ ] RSVP button purpose clear from label
- [ ] Button state announced (RSVP vs Going)
- [ ] Loading state announced
- [ ] Success/error messages announced
- [ ] Cancel action clearly indicated
- [ ] RSVP count changes announced

### **Event Information Screen Reader**
- [ ] Event title and description clear
- [ ] Date/time properly formatted and announced
- [ ] Location information accessible
- [ ] RSVP count announced
- [ ] Event status (cancelled, draft) announced

### **Form Accessibility Screen Reader**
- [ ] Field labels read before inputs
- [ ] Required fields indicated
- [ ] Input types announced (email, password)
- [ ] Validation errors read with context
- [ ] Success messages read after submission

### **Dynamic Content Screen Reader**
- [ ] Live regions used for dynamic updates
- [ ] Page changes announced (navigation)
- [ ] Loading states communicated
- [ ] Error states clearly communicated
- [ ] Content updates announced appropriately

---

## 👁️ Visual Accessibility Checklist

### **Color & Contrast**
- [ ] Text contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Large text contrast ratio ≥ 3:1
- [ ] Interactive elements contrast ≥ 3:1
- [ ] Color not sole indicator of information
- [ ] Links distinguishable from text (underline, color)

### **RSVP Button Visual Testing**
- [ ] Button states visually distinct
- [ ] Disabled state clearly indicated
- [ ] Loading state visually clear
- [ ] Focus state clearly visible
- [ ] Error state visually distinct

### **Typography & Spacing**
- [ ] Text resizable to 200% without breaking
- [ ] Line height ≥ 1.5 for body text
- [ ] Sufficient spacing between elements
- [ ] Text not overlapping or truncated
- [ ] Icons have text alternatives

### **Layout & Responsiveness**
- [ ] Content reflows on zoom (200%)
- [ ] No horizontal scrolling at 1280px width
- [ ] Touch targets ≥ 44×44px on mobile
- [ ] Content accessible in portrait/landscape
- [ ] Modal dialogs work at all sizes

---

## 🧪 Cognitive Accessibility Checklist

### **Content & Language**
- [ ] Simple, clear language used
- [ ] Instructions easy to understand
- [ ] Error messages helpful and specific
- [ ] Consistent terminology throughout
- [ ] Acronyms and abbreviations explained

### **RSVP Flow Cognitive Testing**
- [ ] RSVP process straightforward
- [ ] Confirmation after RSVP clear
- [ ] Cancel process obvious
- [ ] Status changes clearly indicated
- [ ] Help/error messages actionable

### **Navigation & Wayfinding**
- [ ] Page structure predictable
- [ ] Navigation consistent across pages
- [ ] Breadcrumbs or location indicators
- [ ] Clear page titles and headings
- [ ] Search functionality (if present) accessible

### **Error Prevention & Recovery**
- [ ] Form validation prevents errors
- [ ] Confirmation for destructive actions
- [ ] Undo functionality where appropriate
- [ ] Clear error recovery paths
- [ ] Timeouts provide sufficient time

---

## 📱 Mobile Accessibility Checklist

### **Touch & Gesture**
- [ ] Touch targets ≥ 44×44px
- [ ] Sufficient spacing between touch targets
- [ ] No gesture-only controls
- [ ] Alternative to swipe gestures
- [ ] Zoom/pinch works correctly

### **Mobile Screen Reader**
- [ ] VoiceOver (iOS) compatibility
- - [ ] TalkBack (Android) compatibility
- [ ] Touch exploration works
- [ ] Rotor gestures functional
- [ ] Element labels read correctly

### **Mobile Keyboard**
- [ ] On-screen keyboard doesn't obscure content
- [ ] Focus management works with mobile keyboard
- [ ] Form submission works with mobile keyboard
- [ ] Auto-complete/suggestions accessible

---

## 🔄 Testing Scenarios

### **Complete RSVP Flow (Keyboard + Screen Reader)**
1. Navigate to events page using only keyboard
2. Find and activate an event using screen reader
3. RSVP to event using keyboard
4. Verify state change announced
5. Navigate to My RSVPs page
6. Cancel RSVP using keyboard
7. Verify cancellation confirmed

### **Error Scenario Testing**
1. Attempt RSVP with network error
2. Verify error announced and recoverable
3. Test form validation errors
4. Verify error messages accessible
5. Test loading state interruptions

### **Mobile Scenario Testing**
1. Test complete flow on mobile device
2. Use mobile screen reader
3. Test touch accessibility
4. Verify orientation changes work
5. Test zoom functionality

---

## 📊 Testing Results Template

### **Test Session Details**
- **Date**: 
- **Tester**: 
- **Browser**: 
- **Screen Reader**: 
- **Device**: 

### **Results Summary**
- **Passed**: [ ] / [ ]
- **Failed**: [ ] / [ ]
- **Blocked**: [ ] / [ ]
- **N/A**: [ ] / [ ]

### **Critical Issues Found**
1. 
2. 
3. 

### **Recommendations**
1. 
2. 
3. 

### **Retest Required**
- [ ] Yes
- [ ] No
- **Retest Date**: 

---

## 🚀 Automation Integration

### **CI/CD Accessibility Checks**
```bash
# Add to package.json scripts
{
  "test:a11y:automated": "pa11y http://localhost:3000/events",
  "test:a11y:ci": "playwright test --config=playwright.a11y.config.ts",
  "test:a11y:report": "axe-playwright --report-path ./a11y-reports"
}
```

### **Pre-commit Hooks**
```bash
# .husky/pre-commit
npm run test:a11y:unit
npm run lint
```

### **Reporting**
- Automated reports saved to `./a11y-reports/`
- Manual checklist results in project tracking
- Accessibility score in build dashboard

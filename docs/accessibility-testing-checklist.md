# EventHub Manual Accessibility Testing Checklist

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

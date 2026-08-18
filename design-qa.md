# Public Landing Page - Design QA

## Comparison target

- Source visual truth: `design-references/landing-page-reference.png`
- Source pixels: 941 x 1672
- Implementation route: `/`
- Intended state: public, signed-out desktop landing page with navigation, product preview, modules, workflow, roles, product tour, platform advantages, CTA, and footer
- Target desktop viewport: 1440 x 1800 CSS pixels, device scale factor 1
- Responsive target: 390 x 844 CSS pixels, device scale factor 1

## Evidence

- The supplied reference is stored in the repository.
- Real product screenshots are stored under `public/landing/` and used for the hero, product tour, and feature spotlight.
- The local route returns HTTP 200 and server-rendered content contains the hero, product tour, and `/auth/login` destination.
- The mobile navigation and product-tour tabs are implemented as functional client controls.
- A browser-rendered implementation screenshot could not be captured because the required in-app browser runtime exits during startup with `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`.
- Implementation screenshot path: unavailable.
- Browser console inspection: blocked because the browser surface could not start.

## Findings

- [Blocked] Full visual comparison is unavailable.
  - Location: full public landing page at `/`.
  - Evidence: the source reference is available, but no browser-rendered implementation capture can be produced through the required browser surface.
  - Impact: exact desktop and mobile spacing, screenshot crop, typography scale, sticky-header behavior, and section rhythm cannot receive visual sign-off.
  - Fix: reconnect the in-app browser, capture the page at the desktop and responsive target viewports, combine the source and implementation captures, and correct any remaining P0, P1, or P2 mismatch.

## Required fidelity surfaces

- Fonts and typography: the existing system font stack, strong ERP-style hierarchy, and balanced display copy are implemented; rendered comparison is blocked.
- Spacing and layout rhythm: the reference's wide centered container, card grid, workflow sequence, alternating product sections, CTA, and footer are implemented; rendered comparison is blocked.
- Colors and visual tokens: ProBuild teal, white, soft green, slate text, restrained borders, and low-elevation shadows follow the supplied visual direction; rendered comparison is blocked.
- Image quality and asset fidelity: the implementation uses six supplied ProBuild product screenshots rather than placeholders or CSS-drawn dashboard artwork; crop and small-text readability require browser capture.
- Copy and content: content is limited to persisted ProBuild workflows and real roles. Unsupported pricing, customer testimonials, demo booking, public contact details, and fabricated claims are intentionally omitted.

## Interaction and runtime checks

- Root route response: HTTP 200.
- Sign In and Open ProBuild CTAs: implemented with `/auth/login`.
- Public navigation: anchor links to modules, workflow, roles, and product tour.
- Product tour: tab selection updates copy, bullets, and product screenshot.
- Mobile navigation: accessible open/close state and Sign In destination.
- TypeScript: passed.
- ESLint: passed.
- Automated tests: 60 passed.
- Production build: passed.

## Comparison history

- Initial implementation pass created the complete landing hierarchy from the selected reference and existing ProBuild product screens.
- Unsupported marketing elements were replaced with truthful workflow benefits and direct Sign In access.
- Post-build visual comparison is blocked because the in-app browser cannot start.

## Verification status

- Full-view desktop comparison: blocked.
- Focused hero and product-tour comparison: blocked.
- Responsive comparison: blocked.

final result: blocked

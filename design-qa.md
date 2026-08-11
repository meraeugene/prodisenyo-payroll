# Sidebar Brand Mark - Design QA

## Comparison target

- Source visual truth: `design-references/brand-logo-source.jpg` and the user's supplied sidebar screenshot showing the rejected circular crop.
- Implementation route: authenticated dashboard shell on any protected route.
- Intended state: expanded desktop sidebar with a 36 x 36 px standalone building emblem beside the Prodisenyo ProBuild wordmark.
- Source pixels: brand source 1254 x 1254; supplied sidebar screenshot 241 x 64.
- Target CSS viewport and density: desktop dashboard, device scale factor 1.

## Evidence

- The source brand artwork is stored in the repository.
- The replacement asset is `public/prodisenyo-building-mark.png`, an RGBA image with transparent corners and a centered building-mark alpha bounding box.
- The old circular background, border ring, 2.05x crop, embedded company text, and `object-cover` treatment were removed.
- A browser-rendered implementation screenshot could not be captured because the required in-app browser process exits during startup with `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`.
- Implementation screenshot path: unavailable.
- Console inspection: blocked because the browser-rendered page could not be opened.

## Findings

- [Blocked] Rendered logo comparison is unavailable.
  - Location: dashboard sidebar brand header.
  - Evidence: source artwork and generated transparent asset are available, but the protected dashboard could not be captured through the required browser surface.
  - Impact: exact perceived sharpness, optical size, and baseline alignment at 36 px cannot be signed off visually.
  - Fix: reconnect the in-app browser, capture the expanded sidebar at device scale factor 1, and compare the focused brand-header region against the supplied screenshot.

## Required fidelity surfaces

- Fonts and typography: unchanged; the existing Prodisenyo ProBuild wordmark remains in the same component.
- Spacing and layout rhythm: logo slot remains 36 x 36 px; rendered comparison is blocked.
- Colors and visual tokens: replacement emblem uses the supplied teal brand direction; rendered comparison is blocked.
- Image quality and asset fidelity: real raster brand asset used, with transparent background and no CSS/SVG approximation; final small-size sharpness requires browser capture.
- Copy and content: unchanged.

## Comparison history

- Initial source state: full square logo was zoomed 2.05x inside a circular 36 px mask, making the tiny embedded text and building mark muddy.
- Implemented fix: isolated the building emblem, removed embedded text and background, converted it to transparent PNG, removed the circle/ring/crop, and changed all consumers to `object-contain`.
- Post-fix visual evidence: blocked by the in-app browser startup failure.

## Verification

- Focused ESLint check: passed.
- Production build: passed.
- Full-view comparison: blocked.
- Focused logo-region comparison: blocked.

final result: blocked

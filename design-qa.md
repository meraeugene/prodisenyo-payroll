# Login Redesign - Design QA

## Comparison target

- Source visual truth: `design-references/probuild-login.png`
- Source pixels: 1672 x 941
- Browser-rendered implementation: `login-implementation-desktop-passed.png`
- Implementation pixels: 1672 x 941
- CSS viewport: 1672 x 941
- Device scale factor: 1
- Density normalization: none required; source and implementation are equal pixel dimensions
- Route/state: `/auth/login`, signed-out, default empty form, password hidden
- Responsive evidence: `login-implementation-mobile-final.png` at 500 x 900 CSS pixels, device scale factor 1

## Evidence

- Full-view comparison: `login-design-comparison-passed.jpg` (source left, implementation right)
- Focused sign-in-card comparison: `login-card-comparison-passed.jpg` (source left, implementation right)
- Focused comparison was required because field labels, input sizing, button placement, and support-row spacing were not readable enough in the full-view comparison.

## Required fidelity surfaces

- Fonts and typography: passed. The existing system font stack closely matches the reference's neutral sans-serif proportions. Display hierarchy, weights, line height, and wrapping are aligned at the target viewport.
- Spacing and layout rhythm: passed. The 51.8/48.2 split, 578px card width, card height, desktop alignment, field rhythm, button position, divider, support row, and copyright placement match the reference hierarchy. Mobile content stacks without horizontal overflow at the validated responsive viewport.
- Colors and visual tokens: passed. Off-white backgrounds, navy text, muted steel copy, teal accents, borders, and low-elevation shadows match the supplied direction while using the application's established palette.
- Image quality and asset fidelity: passed. The construction background is a project-local raster asset generated for the measured hero slot, and the implementation uses the application's real ProBuild brand mark rather than a code-drawn substitute.
- Copy and content: passed with intentional product constraints. The live app authenticates by username, so the field remains `Username`. Unsupported remember-me and password-recovery controls are not presented as working features; the equivalent spacing is occupied by truthful authorized-account guidance.

## Interaction and runtime checks

- Username and password inputs are required and retain the existing server action.
- Password visibility changed from `password` to `text`; the control changed from `Show password` / `aria-pressed=false` to `Hide password` / `aria-pressed=true`.
- Submit control rendered with the expected `Sign In` label and retains the pending state.
- Local route returned HTTP 200.
- Browser-rendered desktop and responsive screenshots were captured successfully.
- Error-level browser console messages observed during the final check: 0.

## Comparison history

### Iteration 1

- [P2] Hero copy sat about 30px above the reference position.
- [P2] Construction imagery had materially stronger contrast than the reference.
- [P2] Omitting unsupported remember-me and recovery controls shortened the lower form rhythm.

Fixes made:

- Moved the hero copy block down from 9.5vh to 12.5vh.
- Increased the white image veil from 30% to 40%.
- Added supported authorized-company-account guidance so the form preserves the source rhythm without inventing authentication behavior.
- Shifted the desktop panel group down 20px and shortened the administrator guidance to the reference label.

Post-fix evidence:

- `login-design-comparison-passed.jpg`
- `login-card-comparison-passed.jpg`
- No remaining actionable P0, P1, or P2 mismatch is visible.

## Intentional differences

- The reference's email label is replaced by the application's real username credential.
- Remember-me and forgot-password actions are omitted because no persisted workflow or route exists for them.
- The existing ProBuild PB mark is used instead of replacing the product identity with the mockup's different building logo.

## Follow-up polish

- [P3] The generated construction photograph is slightly more building-forward than the source crop, but it matches the reference art direction and preserves equivalent negative space.

final result: passed

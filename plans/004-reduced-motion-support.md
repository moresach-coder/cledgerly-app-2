# 004 — Add prefers-reduced-motion support

- **Status**: TODO
- **Commit**: no-git
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file (`app/globals.css`), ~15 lines added

## Problem

The app has no `prefers-reduced-motion` handling. All keyframe animations (`sheetIn`, `springUp`, `springScale`, `fadeIn`, `expandIn`, `dropdownIn`) and JS-driven transitions (report page stagger, GroupCard expand) run at full intensity regardless of user preference. Users who experience motion sickness or vestibular disorders have no relief.

The six keyframes are defined in `tailwind.config.js:73–101` and applied via Tailwind classes throughout: `animate-sheetIn` (Sheet.tsx:69), `animate-fadeIn` (Sheet.tsx:66, GroupCard.tsx:145), `animate-springUp` (app/page.tsx:116), `animate-springScale` (app/page.tsx:121), `animate-dropdownIn` (Section.tsx after plan 002).

## Target

A global `@media (prefers-reduced-motion: reduce)` rule that:
- Strips `transform` from all keyframe animations, keeping `opacity` transitions (reduced motion ≠ no feedback)
- Shortens durations to ≤200ms
- Does NOT nuke all animation — state indication via opacity remains

```css
/* target — add to app/globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.2s !important;
    transition-duration: 0.2s !important;
  }

  /* Strip transform-based motion from named keyframes, keep opacity */
  @keyframes sheetIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes springUp {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes springScale {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes expandIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes dropdownIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

## Repo conventions to follow

- Global styles live in `app/globals.css`
- Tailwind's `@tailwind base; @tailwind components; @tailwind utilities;` directives are in that file
- The reduced-motion block should go after all `@tailwind` directives so it overrides generated utility classes

## Steps

1. Open `app/globals.css`.
2. At the end of the file, after all existing rules, add the `@media (prefers-reduced-motion: reduce)` block shown in the Target section.
3. That's it — the global override handles all current and future keyframe-based animations. JS-driven inline transitions (report page, toast exit from plan 001) inherit the `transition-duration: 0.2s` override.

## Boundaries

- Do NOT modify `tailwind.config.js` — the source keyframes stay unchanged for users without the preference.
- Do NOT add per-component reduced-motion logic — the global approach covers everything without touching each file.
- Do NOT set `animation: none` — that removes opacity feedback too, which is worse for accessibility.
- If `app/globals.css` no longer contains the Tailwind directives, STOP and report.

## Verification

- **Mechanical**: `npx next build` completes without errors.
- **Feel check**:
  1. In Chrome DevTools → Rendering panel → check "Emulate CSS media feature prefers-reduced-motion: reduce".
  2. Navigate to the Summary page: the overview card should fade in without sliding up or scaling.
  3. Open the EditModal (Sheet): it should fade in without the `translateY(12px)` slide.
  4. Open a kebab menu: it should fade in without scaling from 0.95.
  5. All transitions should feel quick (≤200ms) but not instant — opacity changes remain.
  6. Disable the emulation: all animations should return to their full spring/transform behavior.
- **Done when**: with `prefers-reduced-motion: reduce` enabled, no element slides, scales, or bounces — but every entrance/exit still has an opacity crossfade for state feedback.

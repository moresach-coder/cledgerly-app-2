# Animation Plans

| # | Title | Severity | Status | Files |
|---|---|---|---|---|
| 001 | Toast exit animation | HIGH | TODO | `components/Toast.tsx` |
| 002 | KebabMenu dropdown animation | HIGH | TODO | `components/Section.tsx` |
| 003 | GroupCard height transition | MEDIUM | TODO | `components/GroupCard.tsx` |
| 004 | Reduced motion support | MEDIUM | TODO | `app/globals.css` |

## Execution order

1. **002** first — one class name, zero risk, instant win
2. **001** next — self-contained to Toast.tsx
3. **003** — slightly more structural (conditional render → always-mounted)
4. **004** last — the global reduced-motion override should be applied after all other motion work is finalized, so the keyframe overrides match what's actually in use

## Dependencies

- 004 should be done after 001 (toast exit uses inline transitions that the global `transition-duration` override will cover)
- 002 has no dependencies
- 003 has no dependencies

# Book Dialog Runtime Error — Investigation Plan

Observed error (production only):
- `ReferenceError: Cannot access 'X' before initialization` inside the dialog bundle.

What we changed to stabilize UX
- Render the full dialog only when open (avoid executing heavy code on initial page load).
- Moved taxonomy chips into a separate component and lazy‑load it within the dialog so the core (status, rating, page count) renders first.
- Added build sourcemaps to help trace future errors to source lines.

How to capture source-mapped stack
1) Open preview in browser with DevTools, reproduce the error.
2) With sourcemaps enabled, copy the top frames (now mapped to `.tsx` files).
3) Fix the referenced source directly and remove workarounds if desired.

Likely causes
- Cyclic import across UI primitives and the dialog module, evaluated at top-level in production bundle.
- Large module graph causing evaluation order issues in production minification.

Permanent fix options
- Keep taxonomy chips lazy (recommended) to reduce graph size of the core dialog.
- If a specific import path is identified by sourcemaps, refactor to break the cycle (e.g., move constants/helpers to leaf modules, avoid re-export chains).

Rollback
- The current UX is stable even if taxonomy chips fail to load; the dialog core is functional.

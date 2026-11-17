## Project rules
- Frontend-only demo: state lives in zustand stores persisted to localStorage (skipHydration, rehydrated in __root) so SSR markup stays deterministic.
- Theme: :root holds the dark (default) tokens and `.light` overrides them, so the server render needs no theme class.
- App modules live under the `/app` layout route (shell + page transition); `/` is the demo entry. Routing is TanStack Router (react-router-dom is not supported).
- Shared Torque UI primitives live in src/components/torque, shell pieces in src/components/layout.

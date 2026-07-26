# Lib Structure

`lib/` is split by responsibility so shared helpers do not become a catch-all.

- `app/`: app-shell configuration and composition helpers, such as top-level tabs.
- `auth/`: user role/session helpers and authorization constants.
- `features/`: domain-specific helpers grouped by product feature.
- `integrations/`: external service clients and SDK setup.
- `shared/`: small cross-feature utilities that are not tied to a product domain.
- `utils.ts`: shadcn/ui compatibility helper for `cn`; keep this path stable for UI primitives.

When adding new logic, prefer the narrowest matching feature folder. Use `shared/`
only when at least two unrelated features need the same helper.

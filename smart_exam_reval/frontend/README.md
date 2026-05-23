# Frontend Documentation

## Responsive Design Guidelines

When developing components, always ensure they are mobile-responsive and do not cause horizontal scrolling on smaller devices:
- Utilize Tailwind's responsive breakpoints (e.g., `sm:`, `md:`, `lg:`).
- Wrap top-level layout containers with `overflow-x-hidden` if you use absolute positioning elements near the edge (like background blobs).
- Long unbroken strings (like emails) inside grid or flex layouts should use `break-all` and parent elements should use `min-w-0` to guarantee text wrapping instead of pushing grid bounds.

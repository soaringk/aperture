# Interactive Islands Strategy (Phase 3)

This project is set up to support **Astro Islands** for interactive components (Three.js, Matter.js).

## Implementation Strategy

1.  **Component Directory**: Store interactive components in `src/components/islands/` (e.g., `GravityBall.tsx`).
2.  **Framework**: Use React (already installed) or Svelte/Solid if preferred for performance.
3.  **Usage**: Import and use them in `.mdx` files or `.astro` pages.

## Example Usage in MDX

```mdx
import GravityBall from '../../components/islands/GravityBall';

## Physics Demo

<GravityBall client:visible />
```

## Performance Note
Always use `client:visible` or `client:load` directives to ensure the heavy JavaScript only loads when needed.

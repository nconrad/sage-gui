---
name: compact-imports
description: "Use when formatting or editing import statements in TypeScript/TSX, especially when asked to put imports on fewer lines, keep icon imports compact, or reduce vertical space in import blocks."
---

# Compact Imports

## Goal
Prefer compact multi-symbol imports over tall one-item-per-line blocks when readability is preserved.

## Rules
- Keep grouped imports in a compact block when line length remains reasonable.
- For icon imports like `@mui/icons-material`, keep related symbols together and avoid excessive vertical spacing.
- Preserve existing symbol order unless there is a clear reason to reorder.
- Do not collapse imports so aggressively that lines become hard to scan.
- Keep one import declaration per module unless there is a project-specific reason to split.

## Example
Prefer:

```ts
import { A, B, C, D, E } from '@mui/icons-material'
```

Or a compact wrapped form:

```ts
import { A, B, C, D, E, F, G, H } from '@mui/icons-material'
```

Over very tall blocks with one symbol per line.

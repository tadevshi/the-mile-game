# Design Systems - EventHub

This folder contains the design system specifications for each event theme/preset.

## Structure

Each design system should be in its own folder with the naming convention:

```
frontend/src/design-systems/
├── README.md                    (this file)
├── {theme-name}/               (e.g., "autumn-wedding", "kids-party", etc.)
│   └── DESIGN.md               (the design system specification from Stitch)
└── {another-theme}/
    └── DESIGN.md
```

## Design System Format

Each `DESIGN.md` should be the exported design system from Stitch, which includes:

- **Color palette** (primary, secondary, surface colors)
- **Typography** (fonts, sizes, weights)
- **Spacing** (scale, margins, padding)
- **Components** (buttons, cards, inputs with their states)
- **Design tokens** (CSS variables ready to use)

## Theme Naming Convention

Use lowercase with hyphens:

| Theme | Folder |
|-------|--------|
| Autumn Wedding | `autumn-wedding/DESIGN.md` |
| Kids Birthday | `kids-birthday/DESIGN.md` |
| Elegant Celebration | `elegant-celebration/DESIGN.md` |
| Corporate Event | `corporate-event/DESIGN.md` |
| Beach Party | `beach-party/DESIGN.md` |
| Garden Party | `garden-party/DESIGN.md` |

## How to Export from Stitch

1. Open the design system in Stitch
2. Look for "Export" or "Download" option
3. Select "Markdown" or "DESIGN.md" format
4. Save as `{theme-name}/DESIGN.md`

## Next Steps

Once all design systems are placed here:
1. Parse each DESIGN.md
2. Extract color tokens, typography, spacing
3. Generate CSS variables per theme
4. Implement theme switcher in the app
5. Apply themes to admin panel (as first preview)

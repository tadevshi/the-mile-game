# Design System Document: Editorial Rustic Elegance

## 1. Overview & Creative North Star
**Creative North Star: "The Tactile Keepsake"**

This design system rejects the sterile, "app-like" rigidity of modern SaaS in favor of a high-end editorial experience. It is designed to feel like a heavy-stock wedding invitation or a curated lifestyle magazine. We achieve this through "Organic Asymmetry"—breaking the grid with overlapping elements and generous negative space—and "Tonal Depth," where hierarchy is defined by soft color shifts rather than structural lines. The goal is to evoke the warmth of a terracotta hearth and the crispness of a forest floor.

---

## 2. Colors: The Harvest Palette

The palette is rooted in earth tones, using `surface` and `primary` tokens to create an atmosphere of "Rustic Elegance."

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. All containment must be achieved through background shifts.
- To separate a hero from a feature section, transition from `surface` (#fdf9f3) to `surface-container-low` (#f7f3ed).
- High-priority interactive areas should use `surface-container-highest` (#e6e2dc) to naturally draw the eye.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers.
- **Base Layer:** `surface` (#fdf9f3)
- **Secondary Content:** `surface-container-low` (#f7f3ed)
- **Interactive Cards:** `surface-container-lowest` (#ffffff) – This creates a "lifted" paper effect when placed on a darker surface.

### The "Glass & Gradient" Rule
To add "soul," avoid flat `primary` blocks.
- **CTAs:** Use a subtle linear gradient from `primary` (#813a29) to `primary-container` (#9f513e) at a 135-degree angle.
- **Floating Overlays:** Use Glassmorphism. Apply `surface` at 70% opacity with a `24px` backdrop blur. This allows the warm `terracotta` or `sage` tones to bleed through the interface, softening the digital edge.

---

## 3. Typography: Editorial Authority

The interplay between `Noto Serif` and `Manrope` creates a dialogue between tradition and modern clarity.

- **Display & Headlines (Noto Serif):** Use `display-lg` (3.5rem) for hero statements. Tighten the letter-spacing by `-0.02em` to give it a custom, "printed" feel. Use `primary` (#813a29) for headlines to maintain warmth.
- **Body & Labels (Manrope):** Use `body-lg` (1rem) for all long-form text. The generous x-height of Manrope ensures readability against organic backgrounds.
- **The "Signature" Stroke:** Use `title-sm` in `secondary` (#58624b) for sub-headers or "category" labels above headlines. This creates a sophisticated, multi-layered typographic hierarchy.

---

## 4. Elevation & Depth: Tonal Layering

We do not use shadows to simulate height; we use light and tone.

- **The Layering Principle:** Stack `surface-container-lowest` (#ffffff) on top of `surface-container-high` (#ebe8e2). This creates a crisp, natural distinction that mimics stacked cardstock.
- **Ambient Shadows:** If a floating element (like a modal) requires a shadow, use a "Warm Glow." 
    - *Shadow:* `0 20px 40px rgba(129, 58, 41, 0.06)`. Note the use of the `primary` color in the shadow to ensure it feels like a natural part of the environment, not a grey smudge.
- **The "Ghost Border" Fallback:** If accessibility demands a border, use `outline-variant` (#dac1b8) at **15% opacity**. It should be felt, not seen.
- **Roundedness:** Apply `lg` (1rem) to all containers and `full` (9999px) to pill-style buttons to maintain the "cozy, organic" aesthetic.

---

## 5. Components: Tactile Interactions

### Buttons
- **Primary:** Gradient from `primary` to `primary-container`. White text (`on_primary`). Roundedness: `full`.
- **Secondary:** `secondary_container` (#d6e1c4) background with `on_secondary_container` (#5a644d) text. No border.
- **Tertiary:** Text-only in `primary` (#813a29), with an underline that appears on hover using the `primary_fixed` (#ffdad2) color.

### Cards & Lists
- **Prohibition:** Divider lines are strictly forbidden. 
- **Separation:** Use `spacing-8` (2.75rem) to separate list items, or place each item on a `surface-container-low` background with `md` (0.75rem) corners.
- **Editorial Card:** Overlap a small `surface-container-highest` badge on the top-left of an image to break the rectangular container.

### Input Fields
- **Aesthetic:** Fields should use `surface_container_low` with a bottom-only border in `outline_variant` at 40% opacity. 
- **Focus State:** Transition the background to `surface_container_lowest` and the bottom border to `primary`.

### Navigation (The "Menu Bloom")
- Instead of a standard top bar, use a centered, floating navigation pill using the **Glassmorphism Rule**. This keeps the focus on the editorial content while providing a premium, anchored touchpoint.

---

## 6. Do's and Don'ts

### Do
- **Do use "Breath":** Utilize `spacing-16` (5.5rem) and `spacing-20` (7rem) between major sections.
- **Do use Color as Meaning:** Use `secondary` (Sage) for "confirmed" or "success" states to keep the palette organic.
- **Do mix alignments:** Align some headlines to the left and body text to a narrow, centered column to create an editorial layout.

### Don't
- **Don't use Pure Black:** Never use #000000. Use `on_background` (#1c1c18) for all dark text to maintain the charcoal warmth.
- **Don't use Sharp Corners:** Never use `none` or `sm` roundedness. It breaks the "cozy" promise of the system.
- **Don't over-elevate:** Avoid high-contrast shadows. If the layout feels flat, increase the color contrast between background tiers instead of adding a shadow.
# Design System: Editorial Elegance & Fluid Interaction

## 1. Overview & Creative North Star: "The Digital Gala"
This design system moves away from the rigid, blocky layouts of standard SaaS platforms. Our Creative North Star is **"The Digital Gala"**—an experience that feels as curated and premium as a high-end physical event invitation. 

We achieve this through **intentional asymmetry** and **tonal depth**. Instead of centering everything, we use staggered layouts where imagery overlaps text containers, breaking the "grid prison." The interface should feel like it’s breathing, using the `surface` and `surface-container` tiers to create a sense of physical layering rather than flat digital pixels.

## 2. Colors & Surface Philosophy
The palette is a sophisticated journey through rose and blush tones. We move beyond "pink" into a spectrum of "monochromatic depth."

*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts. Transition from `surface` (#fff4f7) to `surface-container-low` (#ffecf3) to signal a new content block.
*   **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of fine paper. 
    *   **Level 0 (Base):** `surface` (#fff4f7)
    *   **Level 1 (Cards/Sections):** `surface-container-low` (#ffecf3)
    *   **Level 2 (In-set Elements):** `surface-container-highest` (#ffd0e8)
*   **The "Glass & Gradient" Rule:** For floating navigation or hero cards, use Glassmorphism. Apply `surface` at 70% opacity with a `20px` backdrop-blur. 
*   **Signature Textures:** Use a linear gradient from `primary` (#b70049) to `primary-container` (#ff7290) for high-impact CTAs. This creates a "glow" effect that flat colors cannot replicate.

## 3. Typography: The Editorial Contrast
We use a high-contrast pairing to balance elegance with modern readability.

*   **Display & Headlines (Noto Serif/Playfair):** Used for storytelling. `display-lg` (3.5rem) should be used sparingly to "anchor" the page. The serif typeface provides the "Celebratory" and "Elegant" soul of the brand.
*   **Body & Labels (Plus Jakarta Sans/Montserrat):** The workhorse. `body-lg` (1rem) provides a wide, modern tracking that feels premium. 
*   **Hierarchy Note:** Always maintain at least a 2-step jump in the type scale between a headline and its subtext (e.g., `headline-lg` paired with `body-md`) to ensure clear visual dominance.

## 4. Elevation & Depth
We replace "drop shadows" with **Tonal Layering** and **Ambient Light**.

*   **The Layering Principle:** To lift a card, do not reach for a shadow first. Instead, place a `surface-container-lowest` (#ffffff) card on top of a `surface-container` (#ffe0ef) background. The contrast in value creates the lift.
*   **Ambient Shadows:** If a floating state is required (e.g., a modal or hovering FAB), use a custom shadow: `0px 24px 48px rgba(72, 34, 58, 0.08)`. Notice the shadow is a tint of our `on-surface` (#48223a), not pure black.
*   **The Ghost Border:** If accessibility requires a stroke, use `outline-variant` (#d39dbb) at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism Depth:** When using glass elements, add a `0.5px` inner stroke using `white` at 30% opacity on the top and left edges to mimic light hitting the edge of a glass pane.

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), `full` roundedness (9999px), `title-sm` typography. 
*   **Secondary:** `surface-container-lowest` fill with a `primary` text color. No border.
*   **Tertiary:** Ghost style. No fill, no border. Underline on hover using the `primary` color at `2px` thickness.

### Cards (Event & Feature Cards)
*   **Structure:** No dividers. Use `spacing-6` (2rem) of internal padding.
*   **Separation:** Use a vertical whitespace shift of `spacing-10` (3.5rem) between stacked items instead of lines.
*   **Interaction:** On hover, a card should shift from `surface-container-low` to `surface-container-highest` rather than growing in size.

### Glass Navigation Bar
*   **Style:** Positioned `fixed`, top-mounted with `xl` (1.5rem) rounded corners and a margin of `spacing-4` from the screen edges.
*   **Effect:** `surface` color at 60% opacity with `blur(12px)`.

### Event Chips
*   **Style:** `surface-variant` background, `on-surface-variant` text. Use `sm` (0.25rem) roundedness for a slightly more architectural, "ticket-stub" feel.

## 6. Do’s and Don’ts

### Do:
*   **Do** overlap elements. Let a high-quality event photo break the boundary of the container below it.
*   **Do** use asymmetrical margins. A hero image can be flush to the right edge while text is indented `spacing-12` from the left.
*   **Do** use `on-primary-container` (#4d001a) for small captions over pink backgrounds to maintain AAA accessibility.

### Don’t:
*   **Don’t** use pure black (#000000) for text. Always use `on-background` (#48223a) to keep the palette warm and cohesive.
*   **Don’t** use standard `0.5rem` border radii for everything. Mix `full` (pill-shaped) buttons with `xl` (1.5rem) containers to create visual interest.
*   **Don’t** use horizontal rules (`<hr>`). Use a background color change or a `spacing-16` gap to define sections.
# Design System Document: The Kinetic Playground

## 1. Overview & Creative North Star
This design system is built to move beyond the "standard" child-centric UI of flat primary colors and rigid grids. Our Creative North Star is **"The Kinetic Playground"**—a digital environment that feels as tactile, energetic, and safe as a high-end children's museum. 

We break the "template" look by embracing **intentional asymmetry**, overlapping organic shapes, and a sophisticated editorial approach to typography. Instead of a flat screen, treat the interface as a physical space where elements float, bounce, and layer. We use high-contrast typography scales and vibrant tonal shifts to guide the eye, ensuring the experience feels premium and curated, not cluttered.

---

## 2. Colors & Surface Architecture
The palette is a high-energy mix of sunny golds, sky blues, and candy pinks, anchored by a lime-tinted neutral base.

### The "No-Line" Rule
To maintain a modern, high-end feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined solely through background color shifts. For example, use a `surface-container-low` (#d9ffbd) section sitting on a `surface` (#eeffdd) background to define a content block.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use Material-style tiers to create depth without visual noise:
*   **Base Layer:** `surface` (#eeffdd)
*   **Secondary Sectioning:** `surface-container-low` (#d9ffbd)
*   **Primary Content Cards:** `surface-container-lowest` (#ffffff)
*   **Interactive Overlays:** `surface-container-high` (#a5ff6f) or `highest` (#80ff2c)

### The Glass & Gradient Rule
Floating elements (like modals or navigation bars) should utilize **Glassmorphism**. Use semi-transparent surface colors with a `backdrop-blur` effect.
*   **Signature Textures:** For primary CTAs and Hero backgrounds, avoid flat fills. Use a subtle linear gradient transitioning from `primary` (#705d00) to `primary-container` (#ffe170) at a 135-degree angle. This adds "visual soul" and a sense of three-dimensional volume.

---

## 3. Typography
Our typography pairing balances the whimsy of a carnival with the authority of a premium app.

*   **Display & Headlines (Plus Jakarta Sans):** This font provides a clean, rounded geometric feel. Use `display-lg` (3.5rem) for hero statements with tight letter-spacing (-0.02em) to create a bold, editorial impact.
*   **Body & Titles (Be Vietnam Pro):** A highly legible sans-serif that maintains the "friendly" vibe without sacrificing professional clarity. 
*   **Hierarchy as Identity:** Use `title-lg` (1.375rem) in `tertiary` (#bb0054) to draw attention to sub-headers, creating a playful rhythm across the page. Always prioritize generous line-height (1.5+) for body text to ensure readability for parents on the move.

---

## 4. Elevation & Depth
In this system, depth is a product of light and layering, not artificial structure.

*   **The Layering Principle:** Achieve lift by stacking. A `surface-container-lowest` card placed on a `surface-container-low` background creates a soft, natural elevation.
*   **Ambient Shadows:** When an element must "float" (e.g., a FAB or a popover), use an extra-diffused shadow. 
    *   *Specs:* Blur: 24px-40px, Opacity: 6%. 
    *   *Color:* Use a tinted version of `on-surface` (#092100) rather than pure black to keep the light feeling "sunny."
*   **The "Ghost Border" Fallback:** If a container requires definition against an identical background, use a Ghost Border: `outline-variant` (#d2c6a1) at **15% opacity**. Never use 100% opaque borders.
*   **Organic Shapes:** Use the Roundedness Scale aggressively. Buttons should use `full` (9999px) for a "bubble" feel, while content cards use `xl` (3rem) or `lg` (2rem) to maintain the soft, safe aesthetic.

---

## 5. Components

### Buttons (The "Bubble" Component)
*   **Primary:** Full-rounded (`full`), using the signature gradient (Primary to Primary-Container). Use `on-primary` (#ffffff) for text.
*   **Secondary:** `secondary-container` (#cae6ff) background with `on-secondary-container` (#004b70) text. No border.
*   **States:** On hover, increase the elevation through a slightly more intense ambient shadow and a 2% scale increase to mimic a physical "bounce."

### Cards & Lists
*   **Constraint:** Dividers and lines are forbidden. 
*   **Separation:** Use `spacing-6` (2rem) of vertical white space or a shift from `surface` to `surface-container-lowest`. 
*   **Layout:** Encourage "breaking the container"—have an icon or a whimsical illustration (like a confetti burst) overlap the edge of the card.

### Input Fields
*   **Style:** Use `surface-container-lowest` fills with a `md` (1.5rem) corner radius. 
*   **Focus:** Instead of a heavy border, use a 2px `primary` shadow glow and shift the background to `surface-bright`.

### Additional Specialized Components
*   **Confetti Sprinkles:** A background decoration component. Use small organic shapes in `secondary`, `tertiary`, and `primary-fixed-dim` scattered at random rotations at 20% opacity behind main content.
*   **Progress Bubbles:** Instead of a linear bar, use a series of `full` rounded circles that "inflate" as the user completes a task.

---

## 6. Do's and Don'ts

### Do
*   **Do** use intentional asymmetry. Place a large `display-md` headline on the left and a floating organic shape on the right.
*   **Do** use "Tone-on-Tone" styling. Use `on-secondary-container` text over a `secondary-container` background for high-end harmony.
*   **Do** leverage white space. High-end design breathes. Use `spacing-12` (4rem) and `spacing-16` (5.5rem) to separate major sections.

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on-surface` (#092100) for a softer, more premium look.
*   **Don't** align everything to a rigid center. It feels like a template. Offset elements to create "kinetic" energy.
*   **Don't** use sharp corners. If the scale doesn't have it, don't create it. The minimum radius should be `sm` (0.5rem), but `lg` (2rem) is our "standard" feel.
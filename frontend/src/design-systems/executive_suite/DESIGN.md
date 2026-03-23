```markdown
# Design System Specification: The Architectural Perspective

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Concierge"**

This design system moves away from the cluttered, "boxed-in" nature of traditional corporate tools. Instead, it adopts an editorial, high-end approach where information is curated rather than merely displayed. By leveraging **intentional asymmetry**, **tonal depth**, and **expansive white space**, we create an environment that feels like a premium physical lounge.

The system breaks the "template" look by treating the screen as a canvas of layered materials. We avoid rigid grids in favor of dynamic compositions where content blocks overlap slightly, and typography drives the hierarchy. The goal is to make the user feel prioritized and efficient, evoking the quiet confidence of a high-stakes executive environment.

---

## 2. Colors: Tonal Architecture
The palette is built on deep navy foundations (`primary: #000e24`) and slate neutrals, punctuated by a sophisticated emerald (`tertiary_container: #002a1d`) that signals action without breaking the sober atmosphere.

### The "No-Line" Rule
To achieve a premium, editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts. For example, a `surface-container-low` (#f0f4f8) sidebar sitting against a `surface` (#f6fafe) main stage. This creates a "seamless transition" that feels more organic and expensive.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers to create "nested" depth:
*   **Base Layer:** `surface` (#f6fafe) for the overall background.
*   **Secondary Layer:** `surface-container-low` (#f0f4f8) for large content areas or side navigation.
*   **Elevated Content:** `surface-container-lowest` (#ffffff) for primary cards or data modules. This creates a "lifted" effect that draws the eye without needing heavy shadows.

### The "Glass & Gradient" Rule
For floating elements like navigation bars or "quick action" modals, use **Glassmorphism**. Apply a semi-transparent `surface` color with a 12px-20px backdrop blur. This allows the sophisticated navy and slate tones to bleed through, softening the interface.
*   **Signature Textures:** For primary CTAs, use a subtle linear gradient from `primary` (#000e24) to `primary_container` (#00234b) at a 135-degree angle. This adds a "silk-like" finish to interactive elements.

---

## 3. Typography: The Editorial Voice
Our typography pairing balances the technical precision of **Inter** with the rhythmic, modern character of **Plus Jakarta Sans**.

*   **The Power of Display:** Use `display-lg` (3.5rem) and `display-md` (2.75rem) in **Plus Jakarta Sans** for hero headlines and section headers. Use tight letter-spacing (-0.02em) to give it an authoritative, "Wall Street Journal" digital-first feel.
*   **The Functional Body:** **Inter** is our workhorse. Use `body-lg` (1rem) for networking bios and `body-md` (0.875rem) for scheduling details. Its high x-height ensures readability in high-density data views.
*   **Hierarchy through Contrast:** Create "Visual Tension" by pairing a large `headline-lg` in Navy (`on_surface`) with a small, all-caps `label-md` in Emerald (`on_tertiary_container`) to label categories or status updates.

---

## 4. Elevation & Depth
We convey hierarchy through **Tonal Layering** rather than traditional structural lines.

*   **The Layering Principle:** Depth is achieved by "stacking." A white card (`surface-container-lowest`) placed on a soft grey background (`surface-container-low`) provides natural separation.
*   **Ambient Shadows:** When an element must float (e.g., a networking profile card), use a shadow with a 32px-48px blur and a 4% opacity. The shadow color must be a tint of our `on_surface` (#171c1f) rather than pure black, ensuring the "glow" feels like natural light hitting a matte surface.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use the `outline_variant` (#c4c6d0) at **15% opacity**. It should be felt, not seen.
*   **Corner Radii:** Apply `DEFAULT` (0.5rem) for cards and inputs. For high-action elements like "Join Session" buttons, use `full` (9999px) to create a "pill" shape that contrasts against the structured, rectangular layout of the scheduling grid.

---

## 5. Components: Refined Interaction

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. Pill-shaped (`full`). High-contrast `on_primary` (#ffffff) text.
*   **Secondary:** No background. Use a "Ghost Border" (outline-variant @ 20%) and `primary` text.
*   **Tertiary (The "Emerald Pulse"):** For networking actions, use `tertiary_fixed_dim` (#8bd6b6) background with `on_tertiary_fixed` (#002116) text.

### Input Fields & Search
*   **Style:** Background `surface_container_highest` (#dfe3e7) with a `none` border. On focus, transition to a `surface_container_lowest` background with a subtle 1px `primary` bottom-border only.
*   **Error State:** Use `error` (#ba1a1a) text for helper messages, but keep the input background a soft `error_container` (#ffdad6) to avoid "visual shouting."

### Cards & Networking Lists
*   **The "No-Divider" Rule:** For the professional schedule, forbid the use of horizontal lines. Use `spacing-6` (2rem) of vertical white space to separate time slots.
*   **Photo Sharing:** Images should use `lg` (1rem) roundness. Overlap a small `surface-container-lowest` badge with the photographer's name in the bottom-left corner to create a layered, "scrapbook-editorial" feel.

### Specialized Components
*   **The "Timeline Anchor":** A vertical line using `surface_variant` (#dfe3e7) that connects schedule dots, using `tertiary` (#00120a) for the "Active" session indicator.
*   **Presence Indicators:** For networking, use a simple 8px circle of `tertiary_fixed_dim` (#8bd6b6) next to names, avoiding "Online" text to keep the UI clean.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use extreme white space. If a section feels "tight," double the spacing using our `spacing-10` (3.5rem) or `12` (4rem) tokens.
*   **Do** use asymmetrical layouts. For photo galleries, mix large "feature" images with smaller "candid" shots to break the grid.
*   **Do** use tonal shifts for hover states. Instead of a border, darken a card from `surface-container-lowest` to `surface-container-high` on interaction.

### Don’t:
*   **Don’t** use pure black (#000000). Always use `primary` (#000e24) for dark text and backgrounds to maintain the "Navy" brand soul.
*   **Don’t** use standard "drop shadows" with high opacity. They look "cheap" and break the editorial aesthetic.
*   **Don’t** crowd the navigation. A few high-intent links are better than a dense menu. Use `label-md` for nav items with generous `spacing-4` (1.4rem) between them.

---
*This document serves as the foundation for all future iterations. When in doubt, prioritize breathing room and typographic clarity over decorative elements.*```
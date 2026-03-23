# Design System: High-End Editorial & Night Lounge

## 1. Overview & Creative North Star
**Creative North Star: The Midnight Curator**

This design system is engineered for an atmosphere of exclusivity, sobriety, and quiet luxury. It rejects the "app-like" fatigue of heavy borders and flat grids, instead leaning into a high-end editorial aesthetic. We treat the digital interface like a prestigious gala invitation or a velvet-lined lounge menu. 

To achieve this, the system prioritizes "darkspace"—a deep, moody vacuum where content is illuminated rather than just displayed. We break traditional templates by using intentional asymmetry, overlapping high-resolution imagery with display typography, and utilizing "tonal layering" to create depth without the clutter of lines.

---

## 2. Colors & Surface Philosophy
The palette is a dialogue between the shadows of a midnight venue (`#131313`) and the liquid warmth of champagne and aged whisky (`#f1c97d`).

### The "No-Line" Rule
Sectioning must never be achieved with 1px solid borders. Boundaries are defined by transitions in surface depth. Use `surface_container_low` against `surface` to indicate a shift in content blocks. 

### Surface Hierarchy & Nesting
Treat the UI as a physical space. 
- **Base Layer:** `surface` (#131313) for the main environment.
- **Sunken Elements:** Use `surface_container_lowest` (#0e0e0e) for input fields or immersive background zones to create a "recessed" feel.
- **Raised Elements:** Use `surface_container_highest` (#353534) for floating cards or navigation menus to pull them closer to the user.

### The "Glass & Gradient" Rule
For premium components like CTAs or Hero Cards, move beyond flat fills. 
- **Signature Glow:** Apply a subtle radial gradient from `primary` (#f1c97d) to `primary_container` (#d4ad65) to mimic the way light hits polished gold.
- **Glassmorphism:** For overlays or navigation bars, use `surface_bright` at 60% opacity with a `backdrop-blur(12px)`. This prevents the "pasted-on" look and keeps the "Night Lounge" atmosphere fluid and interconnected.

---

## 3. Typography
Our typography is the primary driver of the "Editorial" feel. It relies on the high-contrast tension between a heritage Serif and a surgical Sans-Serif.

- **Display & Headlines (`notoSerif`):** This is our "voice." Used for event titles and section headers. High-contrast serifs convey authority and timelessness. Use `display-lg` (3.5rem) for hero moments, ensuring generous tracking and line-height.
- **Body & Labels (`manrope`):** This is our "utility." A clean, modern sans-serif that remains legible in low-light (dark mode) environments. Use `body-lg` (1rem) for descriptions to ensure a spacious, premium feel.
- **The Hierarchy:** Always lead with a Serif headline in `primary` (#f1c97d) followed by a Sans-Serif body in `on_surface_variant` (#d0c5af) to create a clear, sophisticated visual narrative.

---

## 4. Elevation & Depth
In this system, light is a luxury. We do not use structural lines; we use light and shadow.

- **The Layering Principle:** Depth is achieved through the Spacing Scale and Tonal Shifts. A card shouldn't have a border; it should be a `surface_container_high` block sitting on a `surface` background, separated by a `spacing-8` (2.75rem) margin.
- **Ambient Shadows:** For floating elements, use a shadow with a 40px blur, 0% spread, and 6% opacity, colored with `primary_fixed` (#ffdea5). This mimics the soft, golden ambient light of a gala.
- **The "Ghost Border" Fallback:** If a container requires definition (e.g., a button or input field), use the `outline_variant` (#4d4635) at 20% opacity. It should feel like a suggestion of a border, not a hard edge.

---

## 5. Components

### Buttons
- **Primary:** Roundedness `full` (9999px). Background: Gradient of `primary` to `primary_container`. Text: `on_primary`. This is your "Gold Ticket."
- **Secondary (The Ghost):** Roundedness `full`. Background: Transparent. Border: `outline_variant` at 20%. Text: `primary`.
- **Tertiary:** No background or border. `label-md` uppercase with 0.1em tracking.

### Cards & Lists
- **Rule:** Forbid divider lines. 
- **Implementation:** Use `surface_container_low` for the card body. Use vertical spacing (`spacing-6`) to separate list items. Images within cards should have `xl` (0.75rem) rounded corners to feel finished and bespoke.

### Input Fields
- **Style:** Underlined or "Sunken." Use `surface_container_lowest` as the fill with a subtle `primary` glow on focus. Avoid the "boxed" look of standard web forms.

### Signature Component: The "Timeline Micro-Card"
For the Gala schedule, use a vertical layout where icons (Whisky glass, Saxophone) are rendered in `primary` (#f1c97d), paired with `notoSerif` timestamps. No containers—just pure typography and iconography floating in the "darkspace."

---

## 6. Do's and Don'ts

### Do:
- **Use "Darkspace":** Be brave with large margins (`spacing-16` or `20`). Luxury is defined by the space you *don't* fill.
- **Overlap Elements:** Let a serif headline slightly overlap an image or a glass container to create a layered, editorial layout.
- **Tint your Grays:** Ensure all "neutral" surfaces use the `surface` and `surface_container` tokens which are slightly warmed, avoiding sterile, cold grays.

### Don't:
- **No 1px Solid Borders:** Do not use high-contrast lines to separate content. It breaks the "Night Lounge" immersion.
- **No Standard Shadows:** Never use `#000000` for shadows. Always use a tinted shadow based on the `on_surface` or `primary` colors at very low opacities.
- **No Tight Padding:** If an element feels "snug," it isn't premium. Increase the padding by at least two steps on the Spacing Scale.
- **No Pure White:** Use `on_surface` (#e5e2e1) for text; pure white is too harsh for this moody aesthetic.
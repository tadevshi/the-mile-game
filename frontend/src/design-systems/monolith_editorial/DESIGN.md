```markdown
# Design System Specification: High-End Editorial

## 1. Overview & Creative North Star

### The Creative North Star: "The Silent Authority"
This design system rejects the "template-driven" web. Its North Star is **The Silent Authority**—a visual language that speaks through what it omits. Inspired by high-end fashion mastheads and architectural monographs, this system moves beyond simple minimalism into "Editorial Brutalism." 

We achieve a premium feel not through decoration, but through **intentional asymmetry**, **extreme typographic scale**, and **tonal layering**. The goal is to make every digital screen feel like a curated physical object. By utilizing the 0px border-radius (Sharp Edge Mandate), we communicate precision, discipline, and timelessness.

---

## 2. Colors & Tonal Architecture

Color is used only as a functional tool (error states) or as a structural element (grayscale). We rely on the interplay between `surface` and `surface-container` tiers to create a sense of physical weight.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. 
*   **How to separate:** Use a shift from `surface` (#f9f9f9) to `surface-container-low` (#f3f3f3). 
*   **Why:** Lines create visual "noise." Tonal shifts create "atmosphere."

### Surface Hierarchy & Nesting
Treat the UI as a stack of fine paper. Use depth to guide the eye:
*   **Base Layer:** `surface` (#f9f9f9)
*   **Inset Content:** `surface-container-low` (#f3f3f3) for subtle grouping.
*   **Primary Interaction Hubs:** `surface-container-highest` (#e2e2e2) to draw immediate focus.
*   **Floating Elements:** `surface-container-lowest` (#ffffff) to simulate light hitting a raised surface.

### Signature Textures: The Monochromatic Gradient
To prevent a "flat" digital look, use subtle linear gradients on Primary CTAs. Transition from `primary` (#000000) to `primary_container` (#3b3b3b) at a 135-degree angle. This adds "soul" and a tactile, metallic quality to the black elements.

---

## 3. Typography: The Editorial Voice

Hierarchy is driven by the contrast between the sophisticated **Newsreader** (Serif) and the functional **Inter** (Sans-Serif).

*   **Display & Headlines (Newsreader):** Use `display-lg` (3.5rem) for hero statements. Emphasize negative space by using large top margins (`spacing-24`) to let titles breathe like a magazine cover.
*   **Body & Titles (Inter):** Use `body-lg` for all narrative text. The sans-serif should act as the "workhorse," providing a modern, neutral counterpoint to the expressive serif headings.
*   **The "Micro-Label" Aesthetic:** Use `label-sm` (0.6875rem) in all-caps with `0.05em` letter-spacing for metadata. This mimics the "caption" style of architectural journals.

---

## 4. Elevation & Depth

In a world without color, depth is your only way to communicate importance.

### The Layering Principle
Avoid shadows for static elements. If a card needs to stand out, place a `surface-container-lowest` (#ffffff) card on top of a `surface-container` (#eeeeee) background. This "Tonal Lift" is cleaner and more sophisticated than a drop shadow.

### Ambient Shadows & Glassmorphism
When an element must float (e.g., a navigation bar or modal):
*   **Shadow:** Use `on-surface` (#1b1b1b) at 4% opacity with a 32px blur and 16px Y-offset.
*   **Glass Effect:** Use `surface` (#f9f9f9) at 80% opacity with a `20px` backdrop-blur. This ensures the editorial background "bleeds" through, maintaining a cohesive experience.

### The "Ghost Border" Fallback
If contrast is required for accessibility (e.g., an input field), use the `outline-variant` (#c6c6c6) at **20% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons: The Sharp Edge Mandate
*   **All components must use `roundedness-none` (0px).**
*   **Primary:** `primary` (#000000) background with `on-primary` (#e2e2e2) text. Use the "Monochromatic Gradient" for depth.
*   **Secondary:** `outline` (#777777) text with no background. Interaction state: shift background to `surface-container-high` (#e8e8e8).

### Input Fields
*   **Style:** Minimalist underline using `outline-variant` (#c6c6c6). 
*   **Focus State:** The underline transitions to `primary` (#000000) at 2px thickness. 
*   **Error:** Use the `error` (#ba1a1a) token sparingly for text only.

### Cards & Lists
*   **Forbidden:** Divider lines. 
*   **Layout:** Separate list items using `spacing-6` (2rem) of vertical white space. 
*   **Visual Cue:** Use a small 4px x 4px square block (using the `primary` token) next to active list items as a "signature" marker.

### The Editorial "Hero" Component
A bespoke component for this system. A full-width container using `surface-container-highest` with an asymmetrical layout: `display-lg` text aligned to the left, and a `body-md` caption aligned to the far right, creating a tension-filled, premium balance.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace the Void:** Use `spacing-20` and `spacing-24` liberally to separate major sections.
*   **Typeset for Readability:** Keep line lengths for `body-lg` between 60-75 characters.
*   **Use Intentional Asymmetry:** Align headings to the left and body text to a secondary grid column to create a "custom" look.

### Don’t:
*   **No Rounded Corners:** Never use `border-radius`. It breaks the "Sober/Professional" ethos.
*   **No Generic Shadows:** Avoid standard `0 2px 4px` shadows. They look "cheap" in a high-contrast system.
*   **No Pure Black Text on Pure White:** Always use `on-surface` (#1b1b1b) on `surface` (#f9f9f9) to reduce eye strain while maintaining high contrast.
*   **No Icons without Purpose:** Only use icons if they are essential for navigation. Use thin-stroke (1px) icons to match the `inter` typography weight.

---
**Director's Final Note:** This design system is about the "space between." Your most powerful tool is the empty white space on the screen. Treat it with the same respect as the content itself.```
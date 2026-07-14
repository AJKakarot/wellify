# Design System Strategy: Wellify

## 1. Overview & Creative North Star
**Creative North Star: "The Restorative Gallery"**

This design system moves away from the frantic, data-heavy "dashboard" look of traditional health trackers. Instead, it adopts the persona of a high-end wellness retreat or an editorial boutique. We are not just showing numbers; we are curating a lifestyle of calm.

To achieve this, the system rejects the "template" look of rigid, boxed-in grids. We utilize **intentional asymmetry**, where large editorial typography creates an anchor for smaller, floating data points. Elements are layered like physical sheets of fine paper, using **Tonal Depth** rather than structural lines. The goal is a UI that feels "breathable"—giving the user's data room to exist without the clinical pressure of traditional medical software.

---

## 2. Colors & Atmospheric Depth

Our palette intentionally avoids "Clinical Blue" and "AI Purple." We use organic, earth-derived tones to foster trust and lower the user's cortisol levels.

### The "No-Line" Rule
**Explicit Instruction:** Prohibit the use of 1px solid borders for sectioning content. Boundaries must be defined solely through background color shifts or subtle tonal transitions. For example, a `surface-container-low` section should sit directly on a `surface` background to define its area.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following hierarchy to define importance:
- **Base Layer:** `surface` (#fbf9f8) - The foundational canvas.
- **Sectioning:** `surface-container-low` (#f6f3f2) - Large background blocks.
- **Component Layer:** `surface-container-highest` (#e4e2e1) - For cards and high-priority containers.
- **The "Glass & Gradient" Rule:** For floating CTAs or hero moments, use a semi-transparent `surface-container-lowest` (#ffffff at 80% opacity) with a `backdrop-blur` of 12px. This creates a "frosted glass" effect that integrates the UI rather than "pasting" it on top.

### Signature Textures
Main CTAs and health rings should utilize a subtle linear gradient from `primary` (#4d6359) to `primary-container` (#8ca398) at a 135-degree angle. This adds a "soul" to the color that flat hex codes cannot replicate.

---

## 3. Typography: The Wellify Voice

We utilize **Manrope** for its sophisticated balance of geometric clarity and humanist warmth.

* **Display (Large/Medium):** Used for daily summaries or motivational headlines. These should use tight letter-spacing (-0.02em) to feel authoritative and premium.
* **Headline (Small):** Used for section headers. Always pair these with generous top-padding (Spacing 12 or 16) to ensure the "Wellify" feel.
* **Body (Large/Medium):** The workhorse for health insights. Set at 1.5x line height to ensure maximum readability and a relaxed pace.
* **Label (Medium/Small):** Used for micro-data (e.g., "BPM" or "Steps"). These can be set in uppercase with +0.05em letter spacing to provide a "technical yet elegant" contrast to the fluid headlines.

---

## 4. Elevation & Depth: Tonal Layering

Depth is achieved through "stacking" rather than shadow-casting.

* **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. The natural contrast between #ffffff and #f6f3f2 provides enough "lift" for a high-end look without needing heavy shadows.
* **Ambient Shadows:** When a floating element (like a bottom sheet or modal) is required, use an extra-diffused shadow: `box-shadow: 0 24px 48px -12px rgba(27, 28, 28, 0.06)`. The tint is derived from the `on-surface` color, not pure black.
* **The "Ghost Border" Fallback:** If accessibility requires a stroke (e.g., in high-contrast modes), use the `outline-variant` token at 15% opacity. **Never use 100% opaque borders.**

---

## 5. Components: The Wellness Primitive

### Elegant Cards & Lists
* **Rule:** Forbid divider lines. Use vertical white space (Spacing 6 or 8) to separate list items.
* **Styling:** Use `rounded-xl` (1.5rem) for main dashboard cards to evoke a "soft" and "supportive" feel.

### Primary Buttons
* **Background:** Linear gradient (`primary` to `primary-container`).
* **Shape:** Full pill (`rounded-full`).
* **Typography:** `label-md` bold, centered.
* **Padding:** Spacing 4 (vertical) / Spacing 8 (horizontal).

### Data Visualizations (Rings & Progress)
* **Rings:** Use a thick stroke (12px-16px) with `rounded-full` caps. The track should be `surface-container-highest` and the progress should be the `primary` gradient.
* **Progress Bars:** Avoid sharp corners. Use `rounded-full` for both track and filler.

### Input Fields
* **Style:** Minimalist. No bottom line or full box. Use a subtle `surface-container-low` background with a `rounded-md` (0.75rem) corner.
* **State:** On focus, transition the background color to `primary-fixed` at 30% opacity.

### Additional Signature Component: The "Reflection Chip"
* A selection chip used for mood tracking. It uses `secondary-container` with a `secondary` text color. When selected, it expands slightly in size (1.05x scale) rather than just changing color, creating a tactile, "premium" interaction.

---

## 6. Do's and Don'ts

### Do
* **Do** use asymmetrical margins. For example, a header might be indented Spacing 10 while the cards are indented Spacing 6 to create visual interest.
* **Do** use "High-Contrast" scale pairing. Pair a `display-lg` number with a `label-sm` unit of measurement.
* **Do** prioritize `surface-bright` for the most important user-facing data points.

### Don't
* **Don't** use 1px dividers. If you feel you need a line, use a Spacing 8 gap instead.
* **Don't** use "Alert Red" for everything. Use `error` (#ba1a1a) sparingly; for "warning" states, prefer the warmer `secondary` tones to keep the mood supportive.
* **Don't** crowd the edges. If a component feels "okay," add one more level of Spacing Scale padding to make it feel "Premium."
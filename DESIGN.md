# Design System Strategy: The Curated Academic

## 1. Overview & Creative North Star
The "Curated Academic" is our Creative North Star. For our wholesale onion shop management platform ("Vedhaprem Mandi / Wholesale Onion Trading"), we move beyond the "clunky database" aesthetic. Every lot, transaction, customer ledger, and inventory item is presented as a curated object in a high-end editorial workspace.

This system breaks the "enterprise template" look by utilizing **Intentional Asymmetry** and **Tonal Depth**. We prioritize breathing room over information density, ensuring the user feels a sense of calm and control. By layering surfaces rather than boxing them in, we create a UI that feels like a physical, tactile workspace—clean, organized, and premium.

---

## 2. Colors: Tonal Architecture
We use a sophisticated Material-based palette to replace "flat" design with "dimensional" design.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Traditional borders create visual noise and "trap" the eye. Instead, define boundaries through background shifts. A `surface-container-low` section sitting on a `surface` background provides all the separation a user needs without the cognitive load of lines.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested, physical layers:
- **Base Layer:** `surface` (`#fbf9f8`) - The foundational "desk" everything sits on.
- **Sectioning:** `surface-container-low` (`#f6f3f2`) - Grouping related content areas.
- **Sub-surfaces:** `surface-container` (`#f0ece9`) - Middle tonal shelf.
- **Elevated Interactive Cards:** `surface-container-lowest` (`#ffffff`) - Natural "pop" against the background.
- **Input Fills:** `surface-container-highest` (`#e4deda`) - Calm tactile inputs.
- **Elevated Modals & Sheets:** `surface-bright` (`#fbf9f8`) - Reserved for the highest level of focus.

### Accent & Semantic Colors:
- **Primary:** `#005da7` (Deep Indigo / Academic Blue)
- **Primary Container:** `#2976c7` (Vibrant Celestial Blue)
- **On Primary:** `#ffffff`
- **Primary Fixed:** `#d3e4ff`
- **On Primary Fixed:** `#001c3b`
- **Tertiary (Action / Warning / Special Attention):** `#7f5300` (Warm Ochre / Academic Gold)
- **Tertiary Container:** `#ffddb1`
- **On Tertiary Container:** `#2b1700`
- **Secondary:** `#535f70`
- **Secondary Container:** `#d7e3f8`
- **On Secondary Container:** `#101c2b`
- **Success:** `#1e7e34`
- **Success Container:** `#e2f5e7`
- **On Surface:** `#1b1c1c` (Never pure black)
- **On Surface Variant:** `#444748`
- **Outline Variant:** `rgba(116, 119, 121, 0.20)` (Ghost border fallback only)

### The "Glass & Gradient" Rule
- **Main CTAs:** Subtle linear gradient from `primary` (`#005da7`) to `primary_container` (`#2976c7`). Adds a soft, tactile curvature to buttons.
- **Floating Navigation & Sticky Summaries:** Glassmorphism with `surface_container_lowest` at 85% opacity with a `24px` backdrop-blur.

---

## 3. Typography: Editorial Authority
- **Display & Headlines:** **Manrope** - Geometric yet friendly curves for authoritative, editorial headlines.
- **Body & Utility:** **Inter** - Gold standard for readability in data-heavy management systems.
- **Scale:** High-contrast scale with strong tabular numerals for money (₹), weights (KG), bags, rates, and outstanding amounts.

---

## 4. Elevation & Depth: Tonal Layering
- **Layering Principle:** To lift an element, place `surface-container-lowest` on top of a `surface-container-low` or `surface` background.
- **Ambient Shadows:** Custom shadow `0px 12px 32px rgba(27, 28, 28, 0.06)`. Tinted with `on_surface` at very low opacity to mimic natural diffused light.
- **Ghost Border Fallback:** If accessibility requires a stroke, use `outline_variant` at 20% opacity (`rgba(116, 119, 121, 0.20)`).
- **No boxed containers:** Avoid heavy outlines around every card or table row.

---

## 5. Components: Tactile Utility
- **Primary Button:** `rounded-2xl` (1.5rem pebble curvature), subtle gradient background, tactile hover elevation.
- **Chips:** `rounded-full`, no borders, soft container background (`secondary-container`, `tertiary-container`, etc.).
- **Text Inputs:** `surface_container_highest` fill, borderless; on focus transitions to `surface_container_lowest` with a clean 2px bottom bar in `primary`.
- **Lists & Tables:** No divider lines. Vertical spacing (1.5rem) and soft alternating tonal tints (`surface-container-low` vs `surface-container-lowest`).
- **Progress Track:** 8px thick bar with `surface_container_highest` track and `primary` gradient fill with rounded ends.
- **Status Toggles:** Oversized, smooth, tactile comfort.

---

## 6. Business Principles for Wholesale Onion Trading
- Real-time bag weights dynamic calculation: `Σ(Bag Weights) = Total KG × Rate/KG = Total Amount`.
- Multi-mark purchases and sales (Marks: AA, J, K, OK, CV, TC).
- Stock dynamic equation: `Current = Opening + Purchases - Sales ± Adjustments`.
- Customer credit and payment ledgers: Credit increases outstanding; payment decreases outstanding.
- Role-based separation: Salesperson has zero visibility of purchase rates, margins, purchase costs, or vendor confidential pricing.
- Finalized invoices are not overwritten. A correction is recorded in the audit history. Ordinary sales are not held for approval because of margin, loss, or selling rate.

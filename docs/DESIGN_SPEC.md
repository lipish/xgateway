# LLM-Link Design Specifications 

This document defines the core UI/UX standards for the LLM-Link project

## 1. Core Design Tokens

### Colors (HSL)
- **Primary (Brand)**: `270 60% 60%` (Vibrant Purple). Used for primary actions, checkmarks, and focus rings.
- **Background**: `220 20% 97%`. A clean, slightly cool neutral background.
- **Surface**: `0 0% 100%`. Pure white for cards, dialog focus, and input fields.
- **Borders/Inputs**: `220 15% 88%`. Solid, clean lines without excessive shadows.

### Typography
- **Font**: System sans-serif stack (Inter/San Francisco/Segoe UI).
- **Labels**: `font-medium`, `text-sm`. Avoid bold labels for a cleaner look.
- **Titles**: `font-semibold` with tighter letter-spacing.

## 2. Component Standards

### Dialogs
- **Medium Configuration Dialogs**: `max-w-[560px]`.
- **Internal Padding**: `p-6`.
- **Vertical Spacing**: `space-y-5` between major content blocks.
- **Headers**: Use `DialogDescription` with `text-purple-600 font-medium` for sub-headers/hints.

### Inputs & Selects
- **Height**: `h-10` (40px) fixed height.
- **Style**: `bg-background`, `border-input`, `rounded-md`.
- **Interaction**: 
  - Focus: `ring-offset-background`, `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
  - Placeholder: `text-muted-foreground` with standard opacity.

### Buttons
- **Height**: `h-10`.
- **Primary Style**: `bg-purple-600 hover:bg-purple-700 text-white`.
- **Secondary Style**: `variant="outline" border-input hover:bg-accent`.
- **Weight**: `font-medium`.
- **Padding**: `px-10` for main action buttons (Cancel/Confirm/Add) to ensure a substantial, premium feel.

## 3. Layout Principles

- **Field Grids**: Use `grid grid-cols-2 gap-4` for paired fields (e.g., Name/Model).
- **Metric Grids**: Use `grid grid-cols-3 gap-4` for numeric inputs or pricing fields.
- **Required Fields**: Indicate with a red asterisk `*` (`text-destructive`).
## 4. Standardized Card Style (XGateway Style)

All dashboard and monitoring cards must adhere to the following visual hierarchy:

- **Border**: `border border-[#e5e7eb]`
- **Background**: `bg-white` (XGateway Clean)
- **Shadow**: `shadow-sm`
- **Corners**: `rounded-xl` (12px)

### Header Hierarchy
- **Title**: `text-purple-600 font-bold`. Always positioned on the top-left.
- **Icon**: `text-purple-600`. Always positioned on the top-right, aligned with the title.

### Content Hierarchy
- **Large Value**: `text-[#111827] text-3xl font-bold tracking-tight`.
- **Subtitle**: `text-[#6b7280] text-sm/text-[10px] font-medium`. Positioned below the large value.

### Interactive Elements
- **Badges**: Use soft backgrounds with bold text (e.g., `bg-emerald-100 text-emerald-600`).
- **Switches**: Brand purple (`bg-purple-600`) when active.
- **Table Headers**: Light muted background (`bg-muted/30`) with uppercase, tracking-wider labels (`tracking-wider text-[10px]`).

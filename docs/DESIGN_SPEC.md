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

### Toolbar Spacing (Top Tools vs Content)

- When you do not use a page-level title header (e.g. `PageHeader`) and place actions in a top-right toolbar, standardize spacing by using `mb-3` on the toolbar container.
- Do not add extra `mt-*` on the content container to avoid inconsistent spacing across pages and conditional branches.

Recommended structure:

- Toolbar container: `className="flex items-center justify-end mb-3"`
- Content container: `className="flex-1 min-h-0 flex flex-col"`
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
- **Badges**: 
  - **Success Status**: Light violet theme (`bg-violet-50 text-violet-700 border-violet-200`)
  - **General Status**: `bg-muted text-muted-foreground border-0`
  - **Scope Labels**: `variant="secondary"`
- **Switches**: Brand purple (`bg-purple-600`) when active.
- **Table Headers**: Light muted background (`bg-muted/30`) with uppercase, tracking-wider labels (`tracking-wider text-[10px]`).

## 5. Selection & Interaction States

### Table Row Selection
- **Selected State**: `bg-violet-50 border-l-2 border-l-violet-400`
- **Hover State**: `hover:bg-muted/40` or `hover:bg-violet-50`
- **Transition**: `transition-colors` for smooth color changes

### Status Colors
- **Active/Enabled/Success**: Light violet theme (`bg-violet-50 text-violet-700`)
- **Inactive/Disabled**: Muted theme (`bg-muted text-muted-foreground`)
- **Error/Destructive**: Red theme (`bg-destructive text-destructive-foreground`)
- **Warning**: Orange theme (`bg-warning/10 text-warning-foreground`)

### Focus States
- **Input Focus**: `focus:border-primary/20 focus:ring-4 focus:ring-primary/5`
- **Chat Input Focus**: `focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20`
- **Interactive Elements**: `focus-visible:ring-ring/50 focus-visible:ring-[3px]`

## 6. Visual Consistency Examples

### Component Implementation Examples

#### Badge Success Variant
```tsx
// badge.tsx - Success variant
success: "border-violet-400 bg-violet-50 text-violet-700 [a&]:hover:bg-violet-100 focus-visible:ring-violet-500/20"
```

#### Table Row Selection
```tsx
// Consistent across all table components
className={cn(
  "cursor-pointer transition-colors",
  selectedId === item.id 
    ? "bg-violet-50 border-l-2 border-l-violet-400" 
    : "hover:bg-muted/40"
)}
```

#### Status Badge Implementation
```tsx
// For active/enabled status
<Badge 
  variant={isActive ? "success" : "outline"}
  className={isActive 
    ? "bg-violet-50 text-violet-700 border-violet-200" 
    : "bg-muted text-muted-foreground border-0"
  }
>
  {isActive ? "Active" : "Inactive"}
</Badge>
```

### Pages Following This Standard
- **Services Page**: Service list selection, service status badges
- **Providers Page**: Provider list selection, provider status badges  
- **Users Page**: User list selection, user status badges
- **API Keys Page**: API key list selection, status badges
- **Logs Page**: Log entry selection, status indicators
- **Dashboard**: Status indicators, trend colors
- **Analytics Page**: System status labels

### Color Usage Guidelines
- **Primary Purple**: Brand actions, focus states, primary interactions
- **Light Violet**: Success states, active status, selected rows
- **Muted Gray**: Disabled states, inactive status, default borders
- **Destructive Red**: Error states, delete actions, warning indicators
- **Warning Orange**: Caution states, timeout indicators

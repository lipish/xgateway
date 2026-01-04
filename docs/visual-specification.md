# LLM-Link Visual Specification

This document defines the unified visual design system for the LLM-Link admin interface.

## 1. Design Philosophy

- **Soft & Clean**: Avoid harsh borders and high-contrast solid blocks. Use low-opacity backgrounds (e.g., `bg-primary/10`) and subtle shadows.
- **Premium (Glassmorphism Lite)**: Utilize backdrop blurs (`backdrop-blur`) and semi-transparent backgrounds for headers and overlays.
- **Icon-Centric**: Favor high-quality iconography over text-heavy buttons to reduce cognitive load and create a modern aesthetic.
- **Responsive & Dynamic**: Every interaction should feel reactive with subtle hover states and smooth page transitions.

## 2. Color System

### 2.1 Theme Colors
- **Primary**: The brand's signature color. Used for active states, link highlights, and primary icons.
- **Background**: `bg-background` (Pure White or Dark Mode Gray).
- **Muted**: `bg-muted` / `text-muted-foreground`. Used for secondary information and neutral backgrounds.

### 2.2 Functional Palette (Status)
- **Healthy / Success**: 
  - Text: `text-emerald-500`
  - Soft Background: `bg-emerald-500/10`
  - Meaning: Enabled, Active, Connected.
- **Degraded / Warning**:
  - Text: `text-amber-500`
  - Soft Background: `bg-amber-500/10`
  - Meaning: Slow latency, Circuit Breaker Half-Open, Partially Healthy.
- **Unhealthy / Error**:
  - Text: `text-destructive`
  - Soft Background: `bg-destructive/10`
  - Meaning: Disabled, Disconnected, Circuit Breaker Open, Failed.

## 3. Layout & Layout Principles

### 3.1 Page Structure
Every page follows the Standard Container Pattern:
```tsx
<div className="flex flex-col page-transition">
  <Header 
    title={t('title')} 
    description={t('desc')} 
    icon={PageIcon} 
    onRefresh={...}
    actions={...}
  />
  <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto w-full">
    {/* Page Content */}
  </div>
</div>
```

### 3.2 Spacing & Grid
- **Global Padding**: `p-6` for main containers.
- **Vertical Rhythm**: `space-y-6` between major cards or sections.
- **Grid Systems**: 
  - Overview Metrics: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
  - Content Cards: `grid-cols-1 md:grid-cols-2`

## 4. Component Deep-Dive

### 4.1 Buttons & Actions (Mandatory)
- **Rule**: Actions in Page Headers and Table Rows must be **Icon-Only** using `variant="ghost" size="icon"`.
- **Primary Action (Header)**: `variant="ghost" size="icon" className="h-9 w-9"`.
- **Secondary Action (Row)**: `variant="ghost" size="icon" className="h-8 w-8"`.
- **Tooltip**: Every icon button must have a `title` attribute for accessibility/discoverability.
- **Hover**: Buttons should use `transition-colors` with a subtle background shift (e.g., `hover:bg-primary/10`).

### 4.2 Cards
- **Metric Cards**: Minimal padding, large bold values, small descriptive icons in the top right.
- **Content Cards**: Clear `CardHeader` with title and description. `CardContent` should have a top border if it contains a table.
- **Hover State**: Cards that are clickable should have `hover:border-primary/40 transition-colors cursor-pointer`.

### 4.3 Badges (Soft Badges)
- Always use `border-0` and low-opacity backgrounds for a "soft" feel.
- **Active State**: `bg-primary/10 text-primary`.
- **Neutral State**: `bg-muted text-muted-foreground`.

### 4.4 Form Elements
- **Inputs**: Standard Shadcn/Tailwind inputs with consistent height (`h-10`).
- **Selects**: Use the same height as inputs, with clear hover states.
- **Labels**: Small, font-medium, and slightly muted (`text-sm font-medium`).

### 4.5 Dialogs & Modals
- **Standard**: Always use Shadcn UI `Dialog` for modals and interactive popups.
- **Rule**: **NEVER** use native HTML popups like `window.prompt()`, `window.confirm()`, or `window.alert()`. 
- **User Experience**: Modals should have clear titles, descriptions, and consistent footer actions (Cancel vs. Confirm).

## 5. Interactions & Animations

### 5.1 Page Transitions
- Use the CSS class `page-transition` for entry animations (subtle opacity and transform).
```css
.page-transition {
  animation: fade-in 0.3s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 5.2 Micro-interactions
- **Spinning Icons**: Use `animate-spin` for `RefreshCw` during loading.
- **Pulsing States**: Use `animate-pulse` for health indicators of active proxies or auto-refresh toggles.

## 6. Typography & Icons

### 6.1 Typography
- **Heading 1 (Header)**: `text-base font-semibold`. (Header titles are kept reserved for focus).
- **Heading 2 (Card Title)**: `text-lg font-semibold`.
- **Body**: `text-sm text-foreground`.
- **Description / Hint**: `text-xs text-muted-foreground`.

### 6.2 Iconography
- **Library**: `lucide-react` exclusively.
- **Consistency**: 
  - Inline / Primary Actions: `h-4 w-4`.
  - Header Icons (Large): `h-5 w-5` inside a `p-2` container.
  - Sidebar Navigation: `h-4 w-4`.

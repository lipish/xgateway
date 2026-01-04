# XGateway Visual Specification

This document defines the unified visual design system and UI/UX guidelines for the XGateway admin interface.

## 1. Design Philosophy

The XGateway admin interface follows a clean, modern design philosophy with emphasis on:

- **Soft & Clean**: Avoid harsh borders and high-contrast solid blocks. Use low-opacity backgrounds (e.g., `bg-primary/10`) and subtle shadows.
- **Premium (Glassmorphism Lite)**: Utilize backdrop blurs (`backdrop-blur`) and semi-transparent backgrounds for headers and overlays.
- **Icon-Centric**: Favor high-quality iconography over text-heavy buttons to reduce cognitive load and create a modern aesthetic.
- **Clarity**: Clear hierarchy and intuitive navigation.
- **Consistency**: Uniform patterns across all pages.
- **Efficiency**: Quick access to common actions.
- **Responsive & Dynamic**: Every interaction should feel reactive with subtle hover states and smooth page transitions.
- **Accessibility**: Readable text and clear visual feedback.

## 2. Color System

### 2.1 Theme Colors
- **Primary**: The brand's signature color. Used for active states, link highlights, and primary icons.
- **Background**: `bg-background` (Pure White or Dark Mode Gray).
- **Muted**: `bg-muted` / `text-muted-foreground`. Used for secondary information and neutral backgrounds.

### 2.2 Functional Palette (Status)
- **Healthy / Success**: 
  - Text: `text-emerald-500`
  - Soft Background: `bg-emerald-500/10`
  - Dot Indicator: `bg-emerald-500`
  - Meaning: Enabled, Active, Connected, Normal operation.
- **Degraded / Warning**:
  - Text: `text-amber-500`
  - Soft Background: `bg-amber-500/10`
  - Dot Indicator: `bg-amber-500`
  - Meaning: Slow latency, Circuit Breaker Half-Open, Partially Healthy.
- **Unhealthy / Error**:
  - Text: `text-destructive`
  - Soft Background: `bg-destructive/10`
  - Dot Indicator: `bg-destructive`
  - Meaning: Disabled, Disconnected, Circuit Breaker Open, Failed.

### 2.3 Delete Action Colors
- **Rule**: Delete icons in table rows should NOT be red by default
- **Table Row Delete Button**: Use default muted colors `variant="ghost" size="icon" className="h-8 w-8"`
- **Confirmation Dialog**: Use `variant="destructive"` for the final delete action button
- **Rationale**: Reduces visual noise and alarm fatigue; red should be reserved for the actual destructive confirmation

## 3. Layout Structure

### 3.1 Overall Layout
- **Sidebar Navigation**: Left-aligned collapsible sidebar with grouped menu items
- **Header**: Top bar with height `h-14` containing sidebar trigger and user actions
- **Main Content**: Central area with responsive max-width
  - Standard pages: `max-w-6xl`
  - Wide pages (logs, chat, providers): `max-w-[1400px]`
- **Background**: `bg-muted/30` for subtle depth

### 3.2 Sidebar Structure
- **Width**: Auto-sizing based on content
- **Border**: `border-r-0 shadow-sm` (shadow instead of border)
- **Header Section**: 
  - Logo: `h-7 w-7` + Brand name + Language switcher
  - Padding: `px-4 py-4`
- **Navigation Groups**: Hierarchical structure with sections
  - **Main Menu**: Dashboard, Provider Catalog, Service Instances, Chat Test
  - **Management**: Users, API Keys
  - **Monitoring**: Metrics, Trace
- **Active State Indicator**: 
  - Left border: `absolute left-0 -ml-3 w-1 h-5 bg-primary rounded-r-full`
  - Text: `text-primary font-medium`
  - Icon: `text-primary`
- **Group Labels**: `text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider px-3 mb-2`
- **Item Spacing**: `mt-4` between sections

### 3.3 Header Structure
- **Height**: `h-14` fixed
- **Background**: `bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`
- **Border**: `border-b` bottom border
- **Layout**: Flex row with `justify-between`
- **Left Section**: 
  - Sidebar trigger: `className="-ml-1"`
  - Vertical separator: `mr-2 h-4`
- **Right Section**: 
  - Notification icon with badge indicator
  - User dropdown menu
- **Spacing**: `px-4` horizontal padding

### 3.4 User Dropdown Menu
Located in top-right corner of header:
- **Trigger**: Circular button `h-9 w-9 rounded-full bg-muted hover:bg-muted/80`
- **Icon**: User icon `h-5 w-5 text-muted-foreground`
- **Menu Width**: `w-56`
- **Menu Items**:
  1. User info (name + email)
  2. Separator
  3. Settings (with Settings icon)
  4. Help (with HelpCircle icon)
  5. Change Password (with KeyRound icon)
  6. Separator
  7. Logout (red text with LogOut icon)

### 3.5 Page Structure
Every page follows the Standard Container Pattern:
```tsx
<div className="flex flex-col page-transition">
  <Header 
    title={t('title')} 
    subtitle={t('description')} 
    onRefresh={fetchData}
    loading={loading}
    actions={<Button>Action</Button>}
  />
  <div className="flex-1 space-y-6 max-w-[1600px] mx-auto w-full">
    {/* Page Content */}
  </div>
</div>
```

### 3.6 Spacing & Grid
- **Global Padding**: `p-6` for main containers
- **Vertical Rhythm**: `space-y-4` or `space-y-6` between major cards or sections
- **Grid Systems**: 
  - Overview Metrics: `grid gap-4 md:grid-cols-2 lg:grid-cols-4`
  - Content Cards: `grid gap-6 md:grid-cols-2`

## 4. Navigation Structure

### 4.1 Menu Organization
```
Main Menu
├── Dashboard (/)
├── Provider Catalog (/providers)
├── Service Instances (/instances)
└── Chat Test (/chat)

Management
├── Users (/users)
└── API Keys (/api-keys)

Monitoring
├── Metrics (/monitoring)
└── Trace (/logs)
```

### 4.2 Settings & Help Location
- **Location**: Moved from sidebar to user dropdown menu
- **Rationale**: Reduces sidebar clutter, groups user-related actions together
- **Access**: Click user avatar icon in top-right corner

## 5. Component Patterns

### 5.1 Buttons & Actions

#### Icon Buttons (Primary Pattern)
- **Rule**: Actions in Page Headers and Table Rows must be **Icon-Only** using `variant="ghost" size="icon"`
- **Header Actions**: `h-9 w-9`
- **Row Actions**: `h-8 w-8`
- **Tooltip**: Every icon button must have a `title` attribute for accessibility
- **Hover**: Subtle background shift with `transition-colors`

#### Delete Button Pattern
```tsx
// In table row - NO red styling
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8"
  onClick={() => setItemToDelete(id)}
  title={t('common.delete')}
>
  <Trash2 className="h-4 w-4" />
</Button>

// In confirmation dialog - red styling
<Button variant="destructive" onClick={handleDelete}>
  {t('common.delete')}
</Button>
```

#### Action Button Variants
- **Primary**: Solid background with primary color
- **Secondary**: `variant="outline"` with border
- **Ghost**: Transparent background, visible on hover (most common for icons)
- **Destructive**: Used only in confirmation dialogs

### 5.2 Cards

#### Card Structure
- **Border**: Subtle border with shadow
- **Padding**: 
  - Header: `pb-3` reduced padding bottom
  - Content: `pt-6` for content area
- **Header Layout**: Flex row with title left, actions right
- **Background**: Default background with subtle elevation

#### Card Types
1. **Stats Card**: Icon + value + description
   ```tsx
   <Card>
     <CardHeader className="flex flex-row items-center justify-between pb-2">
       <CardTitle className="text-sm font-medium text-muted-foreground">Title</CardTitle>
       <Icon className="h-4 w-4 text-muted-foreground" />
     </CardHeader>
     <CardContent>
       <div className="text-2xl font-bold">Value</div>
       <p className="text-xs text-muted-foreground">Description</p>
     </CardContent>
   </Card>
   ```

2. **Data Card**: Table or list content with actions
3. **Monitor Card**: Status indicators with dot + icon + label
4. **Empty State Card**: Large icon (opacity-20) + message in dashed border

### 5.3 Badges (Soft Badges)

#### Badge Pattern
- Always use `border-0` and low-opacity backgrounds for a "soft" feel
- **Active State**: `bg-primary/10 text-primary border-0`
- **Inactive State**: `bg-muted text-muted-foreground border-0`
- **Clickable Badge**: Add `cursor-pointer` class

```tsx
<Badge
  className={cn(
    "cursor-pointer",
    isActive ? "bg-primary/10 text-primary border-0" : "bg-muted text-muted-foreground border-0"
  )}
  onClick={toggle}
>
  {status}
</Badge>
```

### 5.4 Tables

#### Table Structure
- **Component**: Custom Table components with consistent styling
- **Headers**: `TableHead` with clear labels
- **Cells**: `TableCell` with appropriate padding
- **Row Hover**: Subtle background change
- **Actions Column**: Right-aligned with `className="text-right"`

#### Table Row Actions
```tsx
<TableCell className="text-right">
  <div className="flex justify-end gap-1">
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Icon className="h-4 w-4" />
    </Button>
  </div>
</TableCell>
```

### 5.5 Status Indicators

#### Monitor Status Pattern
```tsx
<div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50">
  <div className="flex items-center gap-3">
    <div className="w-2 h-2 rounded-full bg-emerald-500" />
    <Icon className="w-4 h-4 text-muted-foreground" />
    <span className="text-sm font-medium">Label</span>
  </div>
  <span className="text-sm font-semibold">Status</span>
</div>
```

#### Notification Badge
```tsx
<Button variant="ghost" size="icon" className="relative h-9 w-9">
  <Bell className="h-5 w-5" />
  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
</Button>
```

### 5.6 Forms & Inputs

#### Input Fields
- **Height**: `h-10` standard height
- **Border**: `border border-input` with focus ring
- **Padding**: `px-3 py-2`
- **Placeholder**: `placeholder:text-muted-foreground`
- **Focus**: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

#### Form Layout
- **Grid**: Responsive grid for form fields
- **Labels**: Above input with `text-sm font-medium`
- **Helper Text**: Below input with `text-xs text-muted-foreground`
- **Error Text**: `text-sm text-destructive`

### 5.7 Dialogs & Modals

#### Dialog Structure
- **Width**: `sm:max-w-[425px]` for standard dialogs
- **Components**: Header + Content + Footer
- **Rule**: **NEVER** use native HTML popups (`window.prompt()`, `window.confirm()`, `window.alert()`)
- **Actions**: Cancel (outline) + Confirm (primary) buttons right-aligned
- **Destructive Dialogs**: Red confirm button for delete actions

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      {/* Content */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={cancel}>Cancel</Button>
      <Button onClick={confirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## 6. Typography

### 6.1 Hierarchy
- **Page Title**: Large, bold via Header component
- **Card Title**: `text-lg font-semibold` or `text-sm font-medium`
- **Section Labels**: `text-[11px] uppercase tracking-wider`
- **Body Text**: `text-sm text-foreground`
- **Secondary Text**: `text-muted-foreground`
- **Description**: `text-xs text-muted-foreground`
- **Code**: `font-mono` for technical values

## 7. Icons

### 7.1 Icon System
- **Library**: `lucide-react` exclusively
- **Sizes**: 
  - Small: `h-3 w-3` or `h-3.5 w-3.5`
  - Standard: `h-4 w-4` (most common)
  - Medium: `h-5 w-5` (header icons)
  - Large: `h-12 w-12` (empty states)

### 7.2 Icon Colors
- **Default**: `text-muted-foreground`
- **Active**: `text-primary`
- **Status-specific**: `text-emerald-500`, `text-amber-500`, `text-destructive`

### 7.3 Common Icons
- **Navigation**: LayoutDashboard, Library, Server, MessageSquare, User, Key, Activity, FileText
- **Actions**: Plus, Trash2, RefreshCw, Settings, HelpCircle, Bell, LogOut, ArrowRight
- **Status**: Shield, Zap, Clock, Heart, Database, TrendingUp, Loader2
- **UI Elements**: Copy, KeyRound, Eye, Edit

## 8. Animations & Interactions

### 8.1 Page Transitions
- Use CSS class `page-transition` for entry animations
```css
.page-transition {
  animation: fade-in 0.3s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 8.2 Loading States
- **Skeleton**: Gray boxes with `animate-pulse`
- **Spinner**: `Loader2` icon with `animate-spin`
- **Disabled State**: Reduced opacity during operations
- **Minimum Loading Time**: 800ms for better UX perception

### 8.3 Micro-interactions
- **Hover**: Smooth `transition-colors` on all interactive elements
- **Button Hover**: Subtle background change
- **Card Hover**: Border color shift for clickable cards
- **Icon Spin**: `animate-spin` for refresh/loading icons

## 9. Empty States

### 9.1 Pattern
```tsx
<div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
  <Icon className="h-12 w-12 mx-auto mb-4 opacity-20" />
  <p>{t('noItemsMessage')}</p>
</div>
```

### 9.2 Characteristics
- **Large Icon**: `h-12 w-12` with `opacity-20`
- **Centered Layout**: Both vertical and horizontal
- **Dashed Border**: Subtle border to define area
- **Muted Background**: `bg-muted/20` for contrast
- **Message**: Clear, concise text explaining state

## 10. Responsive Design

### 10.1 Breakpoints
- **Mobile**: Base styles (< 768px)
- **Tablet**: `md:` prefix (≥ 768px)
- **Desktop**: `lg:` prefix (≥ 1024px)

### 10.2 Layout Adaptations
- **Sidebar**: Collapsible on mobile
- **Grid**: 1 column → 2 columns → 4 columns
- **Tables**: Horizontal scroll on mobile
- **Cards**: Stack vertically on mobile
- **Max Width**: Responsive container widths

## 11. Accessibility

### 11.1 Focus States
- **Ring**: `focus-visible:ring-2 focus-visible:ring-ring`
- **Offset**: `focus-visible:ring-offset-2`
- **Keyboard Navigation**: All interactive elements accessible via keyboard

### 11.2 Color Contrast
- **Text**: Sufficient contrast ratios for readability
- **Icons**: Muted by default, primary when active
- **Status Colors**: Distinct colors for different states

### 11.3 ARIA Support
- **Labels**: `title` attribute on all icon buttons
- **Alt Text**: Descriptive alt text for images
- **Semantic HTML**: Proper heading hierarchy and landmarks

## 12. Internationalization

### 12.1 Text Keys
- All user-facing text uses `t()` function from `@/lib/i18n`
- Keys organized by feature: `nav.*`, `dashboard.*`, `providers.*`, `settings.*`, etc.
- Consistent naming: `title`, `description`, `actions`, `status`, etc.

### 12.2 Language Support
- **English (en)**: Primary language
- **Chinese (zh)**: Full translation support
- **Extensible**: Additional languages via locale files in `/admin/src/lib/i18n/locales/`

## 13. Best Practices

### 13.1 DO ✓
- Use consistent spacing with Tailwind utilities
- Apply semantic color system for status and states
- Keep icon buttons neutral (no red) unless in confirmation dialogs
- Use `ghost` variant for most icon buttons
- Group related actions together
- Provide clear visual feedback for all interactions
- Use loading states for async operations
- Implement proper empty states
- Add tooltips to all icon-only buttons
- Follow the established component patterns

### 13.2 DON'T ✗
- Apply destructive colors to delete icons in table rows
- Mix different button sizes in the same context
- Use custom colors outside the design system
- Skip loading states for async operations
- Forget hover states on interactive elements
- Use native browser alerts/confirms/prompts
- Add standalone Settings/Help to sidebar (use user menu instead)
- Use unclear or ambiguous icon choices
- Hardcode text strings (always use i18n)
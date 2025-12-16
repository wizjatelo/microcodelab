# µCodeLab v2.0 Design Guidelines

## Design Approach

**Selected Framework:** Material Design 3 with developer-focused customization
**Reference Inspiration:** VS Code (editor layout), Linear (clean UI patterns), Notion (flexible content), GitHub (developer familiarity)

**Core Principles:**
- Information density without clutter
- Clear visual hierarchy for complex workflows
- Persistent navigation and context awareness
- Immediate visual feedback for real-time operations

---

## Typography System

**Font Families:**
- **UI Text:** Inter (via Google Fonts) - weights 400, 500, 600
- **Code/Monospace:** JetBrains Mono - weights 400, 500, 700
- **Headings:** Inter - weights 600, 700

**Type Scale:**
- Page titles: text-2xl (24px) font-semibold
- Section headers: text-lg (18px) font-semibold
- Body text: text-sm (14px) font-normal
- Code editor: text-sm (14px) in monospace
- Labels/metadata: text-xs (12px) font-medium
- Button text: text-sm (14px) font-medium

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 or p-6
- Section spacing: gap-6 or gap-8
- Tight spacing: gap-2 or gap-4
- Large separations: mb-8 or mt-8

**Application Structure:**

**Three-Panel Layout:**
- Left sidebar: 64px (collapsed) or 240px (expanded) - fixed position
- Main content: flex-1 with max-width constraints per view
- Right panel: 320px (collapsible) for properties/settings

**Top Navigation Bar:**
- Height: h-14 (56px)
- Contains: Logo, project name, breadcrumb navigation, user menu
- Sticky position with subtle elevation

**Content Area Constraints:**
- Maximum prose width: max-w-7xl for dashboards
- Code editor: full-width within available space
- Forms/settings: max-w-4xl centered

---

## Component Library

### Navigation Components

**Sidebar Navigation:**
- Icon-first design with optional labels
- Active state: subtle left border (4px) + background treatment
- Groupings separated by gap-4 with dividers
- Icons from Heroicons (outline style)

**Breadcrumb Trail:**
- Text-sm with chevron separators
- Interactive elements for navigation
- Truncate long names with tooltips

### Editor Components

**Code Editor Panel:**
- Full-height layout with tab bar
- Line numbers: 48px gutter width
- Tab bar: h-10 with close buttons
- Status bar at bottom: h-8 with file info

**Dashboard Builder Canvas:**
- Grid overlay (24-column system) with 8px base unit
- Snap-to-grid functionality
- Widget outline on hover: 2px dashed border
- Selection state: 2px solid border + corner handles (8px squares)

### Widget Components (Dashboard Builder)

**Control Widgets:**
- Button widget: min-h-10, rounded-lg, consistent with UI buttons
- Slider widget: h-2 track with h-4 thumb
- Toggle switch: w-11 h-6 with smooth transition
- Joystick widget: 120px circle with center indicator

**Display Widgets:**
- Gauge widget: 160px diameter with arc display
- Chart widget: min-h-64 with Chart.js integration
- Value display: Large text (text-4xl) with label (text-sm)
- Log console: Monospace text with line numbers, max-h-96 overflow

### Data Visualization

**Real-time Charts:**
- Line charts for time-series data
- Auto-scrolling horizontal axis
- Legend positioned top-right
- Grid lines with subtle opacity
- Tooltips on hover with precise values

**Status Indicators:**
- Connection status: 8px circle (pulsing animation when connecting)
- Device status: Badge with icon + text
- Data freshness: Timestamp with relative time

### Form Elements

**Input Fields:**
- Height: h-10 for standard inputs
- Border: 1px with rounded-md
- Focus state: 2px border with ring effect
- Labels: text-sm font-medium, mb-2
- Helper text: text-xs, mt-1

**Buttons:**
- Primary: h-10, px-6, rounded-lg, font-medium
- Secondary: h-10, px-4, rounded-lg with border
- Icon buttons: w-10 h-10 square or circular
- Disabled state: 50% opacity

### Panels & Cards

**Card Component:**
- Border: 1px solid with rounded-lg
- Padding: p-6 for content
- Header: pb-4 with border-bottom when present
- Subtle elevation for hierarchy

**Modal Dialogs:**
- Overlay: Semi-transparent backdrop with blur effect
- Modal: max-w-2xl, rounded-xl, p-6
- Header: text-xl font-semibold, mb-4
- Footer actions: Right-aligned with gap-3

**Collapsible Panels:**
- Header: h-12 with chevron icon
- Content: Smooth height transition (300ms)
- Border separator between sections

---

## Screen-Specific Layouts

### Project Dashboard View
- Top: Metrics bar (h-20) showing device count, projects, status
- Main: 3-column grid of project cards (grid-cols-3 gap-6)
- Card design: Image/preview + title + metadata + actions

### Code Editor View
- Split layout: 60% editor / 40% serial monitor/console
- Resizable divider between panels
- File tree: Left sidebar 240px width
- Tab bar for open files with close buttons

### Dashboard Builder View
- Left: Widget palette (240px) with categorized sections
- Center: Canvas area with grid and zoom controls
- Right: Properties panel (320px) for selected widget
- Bottom: Device connection status bar (h-10)

### Device Management View
- Table layout with device rows
- Columns: Status icon (32px), Name, Type, Connection, Actions
- Row height: h-16 with hover state
- Bulk actions toolbar when items selected

---

## Interaction Patterns

**Drag & Drop:**
- Ghost outline during drag (opacity-50)
- Drop zones highlighted with dashed border
- Smooth snap animation on drop (200ms ease)

**Loading States:**
- Skeleton screens for content loading
- Spinner (24px) for inline operations
- Progress bars: h-2 with animated fill

**Notifications/Toasts:**
- Position: top-right, stacked vertically
- Width: max-w-sm
- Auto-dismiss: 4 seconds
- Icon + message + close button

---

## Images

**Project Template Thumbnails:**
- Location: Project creation screen and project cards
- Dimensions: 16:9 aspect ratio, 320px width minimum
- Content: Illustrative diagrams of ESP32 boards, circuit layouts, dashboard previews

**Dashboard Widget Previews:**
- Location: Widget palette in dashboard builder
- Dimensions: Square thumbnails, 64px × 64px
- Content: Simplified visual representation of each widget type

**Empty States:**
- Location: No projects view, no devices connected, empty dashboard
- Dimensions: 240px × 180px centered illustrations
- Content: Simple line illustrations of IoT devices, code symbols

**Hero Section (Landing/Welcome):**
- Location: First-time user welcome screen
- Dimensions: Full viewport width, 60vh height
- Content: Split-screen showing code editor on left, live dashboard on right with animated data flow between them
- Treatment: Modern, technical aesthetic with subtle grid overlay

---

## Responsive Behavior

**Breakpoints:**
- Desktop: lg: 1024px+ (default three-panel layout)
- Tablet: md: 768px (two-panel, collapsible sidebar)
- Mobile: base (single panel, bottom navigation)

**Mobile Adaptations:**
- Sidebar converts to bottom navigation bar
- Code editor: Full-screen with floating toolbar
- Dashboard builder: Simplified to list view with tap-to-edit
- Tables: Card layout with stacked information
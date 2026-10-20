# UI Design System: Luxury Hospitality Opening & QC

This reference provides exact Tailwind CSS classes, color palettes, and component blueprints for creating an ultra-luxurious, modern 5-star hotel inspection experience.

---

## 1. Color Palette Tokens

### Primary Theme: Obsidian & Champagne Gold (Dark Luxury) or Ivory & Warm Slate (Light Luxury)

```css
/* Color Palette Variables */
:root {
  /* Warm Ivory / Pearl Background (Light Mode) */
  --background: 40 20% 98%;
  --foreground: 220 20% 12%;
  
  --card: 0 0% 100%;
  --card-foreground: 220 20% 12%;
  
  /* Champagne Gold Accent */
  --primary: 43 55% 52%; /* #c9a84d */
  --primary-foreground: 0 0% 100%;
  
  /* Muted Slate Surfaces */
  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;
  
  --border: 220 13% 91%;
  
  /* Status Colors */
  --status-pass: 152 69% 40%;
  --status-warning: 38 92% 50%;
  --status-defect: 350 84% 60%;
}

.dark {
  /* Obsidian Slate (Dark Mode) */
  --background: 224 25% 6%; /* #0B0E14 */
  --foreground: 210 20% 98%;
  
  --card: 224 22% 9%; /* #0F131C */
  --card-foreground: 210 20% 98%;
  
  /* Refined Gold / Bronze Accent */
  --primary: 43 65% 55%; /* #D8B24B */
  --primary-foreground: 224 25% 6%;
  
  --muted: 224 16% 14%;
  --muted-foreground: 218 11% 65%;
  
  --border: 224 16% 16%;
}
```

---

## 2. Typography Pairings

- **Body & Controls**: `Plus Jakarta Sans` or `Inter`
  - Crisp, modern, extremely legible on iPad and mobile under direct sunlight or dim hotel corridors.
- **Headings & Key Metrics**: `Outfit` or serif accent `Playfair Display`
  - Gives the app an architectural/concierge editorial prestige.

---

## 3. Key UI Component Guidelines

### A. Room Handover Status Grid (Room Matrix)
- Interactive floor-by-floor room grid (e.g. Floor 1 to Floor 15, Rooms 101-125).
- Each room tile displays:
  - Room Number
  - Room Type (Deluxe, Suite, Presidential)
  - Color-coded border and status pill:
    - 🟢 **Certified / Ready** (`border-emerald-500/30 bg-emerald-500/5 text-emerald-400`)
    - 🟡 **In Inspection** (`border-amber-500/30 bg-amber-500/5 text-amber-400`)
    - 🔴 **Snags Pending** (`border-rose-500/30 bg-rose-500/5 text-rose-400`)
    - ⚪ **Not Started** (`border-border/40 bg-card/40 text-muted-foreground`)
  - Clicking room opens a split-sheet or full inspection drawer with the checklist.

### B. Mobile Quick Inspection Bar
- Fixed bottom panel with prominent thumb targets:
  - `[ PASS (Green) ]`
  - `[ SNAG / DEFECT (Red + Camera Icon) ]`
  - `[ N/A ]`
- Tapping `SNAG` opens a bottom sheet:
  - Category / Item auto-filled
  - Photo snap/upload box with preview
  - Severity chip picker: *Minor Aesthetic (P4)* | *Operational (P3)* | *Guest Critical (P2)* | *Life Safety / Handover Blocker (P1)*
  - Assignee selector (e.g. *PT Adhi Karya (Civil)*, *Daikin HVAC*, *IT Vendor*)

### C. Executive Dashboard Widgets
1. **Opening Countdown Banner**:
   - "Grand Opening: Nov 15, 2026 — 27 Days Remaining"
   - Overall Readiness Progress Ring (e.g., 78.4% ready)
2. **Defect Burn-down Chart**:
   - Total Snags logged vs. Total Rectified vs. Total Verified
3. **Department Readiness Cards**:
   - IT & Systems (92% ready, 3 blockers)
   - Housekeeping (85% ready, 12 rooms pending deep clean)
   - MEP Engineering (74% ready, chiller balancing in progress)
   - F&B (68% ready, cold kitchen testing)
   - Life Safety & Civil (95% certified)

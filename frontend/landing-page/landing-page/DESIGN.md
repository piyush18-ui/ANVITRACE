# 🛡️ ANVITRACE — Design System & Visual Specification

> **Official Design Architecture Document for ANVITRACE**  
> *Offline Cyber-Forensics & Financial Crime Investigation Platform*  
> **Version:** 2.0 (Solid Forensic Redesign) • **Date:** October 2026

---

## 1. Executive Summary & Design Direction

**ANVITRACE** is an air-gapped, offline cyber-forensics platform engineered for law enforcement agencies, cyber crime investigation cells, and bank financial audit units.

### Visual Persona
```
Government Forensic Intelligence + High-Trust Financial Crime Investigation + Court-Admissible Precision
```

The visual identity is deliberately **anti-generic SaaS**. It avoids the tired "blue-purple AI startup" tropes (gradient text, glowing blobs, neon cards, particle overlays) in favor of a crisp, sober, authoritative intelligence interface.

### Core Visual Principles
1. **Solid Palette Over Gradients**: Clean solid colors only. Zero multi-color gradients, zero gradient text, zero glowing background blobs.
2. **Restrained Accent Hierarchy**: Neutral near-black charcoal base with deliberate, purposeful amber/yellow highlights for buttons, active states, and focal points.
3. **Information Density with Breathability**: Clean card groupings with 10–14px corner radius (`rounded-xl`), 1px solid neutral gray borders (`border-zinc-200`), and generous whitespace.
4. **Evidentiary Integrity**: Cryptographic hashes, exact monetary figures, and deterministic lineage indicators formatted with tabular monospace fonts.

---

## 2. Color System & Design Tokens

### 2.1 Color Rules & Strict Restrictions

> [!IMPORTANT]
> **ABSOLUTELY FORBIDDEN**:
> - Blue gradients
> - Purple gradients
> - Blue-purple gradients
> - Neon gradients
> - Glowing gradient backgrounds
> - Gradient text
> - Large colorful gradient blobs

### 2.2 Forensic Palette

| Role | Color Name | Hex Code | Tailwind Token | Application |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Background** | Pure / Off-White | `#fbfbfd`, `#fafafc` | `bg-[#fbfbfd]`, `bg-[#fafafc]` | Main page background, subtle alternating section rhythm |
| **Card Background** | Solid White | `#ffffff` | `bg-white` | Elevated feature cards, data tables, graph canvases |
| **Primary Text** | Near-Black Charcoal | `#090a0c`, `#18181b` | `text-zinc-950`, `text-zinc-900` | Bold headlines, primary card titles, key metric numbers |
| **Secondary Text** | Neutral Gray | `#52525b`, `#71717a` | `text-zinc-600`, `text-zinc-500` | Explanatory body text, subheadings, metadata labels |
| **Borders** | Light Neutral Gray | `#e4e4e7` | `border-zinc-200` | 1px card perimeters, section dividers, table rows |
| **Primary Accent** | Restrained Amber | `#f59e0b`, `#d97706` | `bg-amber-500`, `text-amber-700` | Active tab pills, notification pips, underline highlights, CTA buttons |
| **Dark Sections** | Deep Sovereign Charcoal | `#090d16`, `#060b18` | `bg-[#090d16]`, `bg-[#060b18]` | Window headers, Closing CTA section, and Forensic Footer |
| **Warning** | Saturated Orange | `#ea580c` | `orange-600` | High-risk thresholds, velocity warnings |
| **Critical** | Pure Red | `#ef4444`, `#dc2626` | `rose-600`, `red-600` | Victim node designations, mule risk index ≥80 |
| **Success / Hold** | Muted Green | `#059669`, `#10b981` | `emerald-600`, `emerald-700` | Terminal cashout freeze targets, verified chain of custody |

---

## 3. Typography & Hierarchy

### 3.1 Font Stack
- **Primary Interface & Headings**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- **Quantitative & Forensic Proof**: `JetBrains Mono`, `ui-monospace`, `SFMono-Regular`, `monospace` with `font-feature-settings: "tnum"` (tabular numbers)

### 3.2 Typographic Hierarchy Table

| Level | Size | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | `48px` – `56px` | Extrabold (800) | `-0.025em` | Hero section main headline |
| **Section Title** | `30px` – `36px` | Extrabold (800) | `-0.02em` | Section headers (`<h2>`) |
| **Card Title** | `15px` – `17px` | Bold (700) | `-0.01em` | Feature card headings (`<h3>`) |
| **Body Text** | `14px` – `15px` | Normal (400) | `normal` | Section descriptions, card paragraphs |
| **Category Pill** | `11px` – `12px` | Semibold (600) | `+0.05em` | Uppercase section badges with amber dot |
| **Forensic Data** | `11px` – `13px` | Semibold (600) | `normal` | Account numbers, transaction values, timestamps |
| **Hash Stamp** | `9px` – `10px` | Medium (500) | `normal` | SHA-256 cryptographic provenance strings |

---

## 4. UI Components & Card Architecture

### 4.1 Card Design Standard
```css
border-radius: 12px;           /* 10px - 14px (rounded-xl) */
border: 1px solid #e4e4e7;     /* 1px solid border-zinc-200 */
background: #ffffff;           /* Solid pure white */
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); /* Very subtle shadow */
transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
```

**Hover Behavior**:
- Subtle elevation: `-translate-y-0.5` (-2px lift)
- Border darkening: `hover:border-zinc-300`
- Shadow expansion: `hover:shadow-md`
- Icon container accent: subtle amber border tint

### 4.2 Button Design Standard
- **Primary Button**: Solid dark charcoal (`bg-zinc-950 text-white hover:bg-zinc-800`) or Solid amber in closing CTA (`bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold`). NO gradient fills.
- **Secondary Button**: Solid white (`bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300`).
- **Corner Radius**: `10px` – `12px` (`rounded-xl`).
- **Padding**: `px-5 py-2.5` (compact) to `px-7 py-3.5` (hero CTA).

---

## 5. Section Breakdown & Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. NAVBAR: h-16, Solid Near-Black Emblem, Zinc-200 Border, CTAs  │
├──────────────────────────────────────────────────────────────────┤
│ 2. HERO: Solid #fafafc, Bold Inter, Clean Metrics, LE Trust Strip│
├──────────────────────────────────────────────────────────────────┤
│ 3. THE CHALLENGE: Solid Cards (Raw Ledger vs Structured Linage)  │
├──────────────────────────────────────────────────────────────────┤
│ 4. HOW IT WORKS: 3 Solid White Step Cards & 7-Step Pipeline Strip│
├──────────────────────────────────────────────────────────────────┤
│ 5. CAPABILITY GRID: 2 × 3 Solid White Cards with Amber/Zinc Data │
├──────────────────────────────────────────────────────────────────┤
│ 6. PRODUCT SHOWCASE: Full Console in Deep Charcoal + Amber Paths│
├──────────────────────────────────────────────────────────────────┤
│ 7. FORENSIC INTELLIGENCE: Lineage Conservation, Risk, Syndicates │
├──────────────────────────────────────────────────────────────────┤
│ 8. EVIDENCE & TRUST: Case Diary, Freeze Notice & Charcoal Panel  │
├──────────────────────────────────────────────────────────────────┤
│ 9. CLOSING CTA: Solid #090d16 Deep Charcoal, Amber CTA, Dome SVG │
├──────────────────────────────────────────────────────────────────┤
│ 10. COMPACT FOOTER: Solid Charcoal #060b18, Clean Two-Tier Links │
└──────────────────────────────────────────────────────────────────┘
```

### 5.1 Navbar (`LandingNavbar.tsx`)
- Height `64px` (`h-16`), solid white background with `backdrop-blur-md` and `border-b border-zinc-200`.
- Solid near-black geometric logo badge with amber highlight.
- Compact navigation items with subtle hover transitions.
- Air-gap badge: `Offline DuckDB Core` in subtle emerald.
- CTA: Solid `bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl`.

### 5.2 Hero (`HeroSection.tsx`) & Console (`DashboardMockup.tsx`)
- Background: Solid `#fafafc` on subtle 40px neutral zinc grid.
- Bold Inter headline with amber underline decoration.
- 4 white metric cards with `border-zinc-200` and subtle hover lift.
- Console window: Deep charcoal header bar (`#090d16`), solid SVG vector trails with directional strokes (amber, emerald, neutral zinc), no glowing gradient blobs.

### 5.3 Core Capabilities (`CapabilityGrid.tsx`)
- 6 solid white cards with zinc-200 borders and 10–14px radius.
- Embedded visuals:
  - 4-Hop Money Tracing: SVG multi-layer lineage (VIC red, L1 amber, L2 charcoal, L3 emerald).
  - Mule Detection: Clean risk table with color-coded score tags.
  - Risk Analysis: Precision gauge with top risk signals list.
  - Velocity Timeline: Inflow (charcoal) vs Outflow (amber) 15-day bars.
  - Network Graph: Interactive topology with floating chip.
  - Evidence Reports: Standardized Case Report card with PDF export action.

### 5.4 Closing CTA (`FinalCTASection.tsx`)
- Solid `#090d16` deep charcoal container with `border-t border-zinc-800`.
- Faint High Court / Police Commissionerate architectural dome vector watermark in `text-zinc-700 opacity-[0.20]`.
- Action buttons: High-contrast solid amber button (`bg-amber-500 text-zinc-950 font-bold`) + dark secondary button.
- 3 solid charcoal feature cards with zinc-800 borders.

### 5.5 Footer (`LandingFooter.tsx`)
- Solid `#060b18` deep midnight background with `border-t border-zinc-800/80`.
- Compact two-tier design with structured navigation columns, trust tags, and legal compliance disclaimers.

---

## 6. Directory Structure & Maintenance

All components exist in both the primary application and the standalone modular folder:
- Primary Application: [`frontend/src/components/landing/`](file:///d:/Hackthons/Voidhacks/DoomStack-Voidhacks8.0-foundation-setup/DoomStack-Voidhacks8.0-foundation-setup/frontend/src/components/landing/)
- Standalone Portable Package: [`landing-page/src/components/`](file:///d:/Hackthons/Voidhacks/DoomStack-Voidhacks8.0-foundation-setup/DoomStack-Voidhacks8.0-foundation-setup/landing-page/src/components/)

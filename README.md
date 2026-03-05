# PayCalc — Automated Payroll System

> Next.js 14 · TypeScript · Tailwind CSS · Apple-inspired design

A professional payroll automation tool for accountants. Upload your biometric attendance report (XLS/XLSX/CSV), set pay rates, and instantly generate a complete payroll — no manual lookup per employee.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
http://localhost:3000
```

## Build for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
paycalc/
├── app/
│   ├── components/
│   │   ├── StepIndicator.tsx   # 3-step progress nav
│   │   ├── UploadZone.tsx      # Drag-and-drop file upload
│   │   ├── RateConfig.tsx      # Pay rate configuration
│   │   ├── SummaryCards.tsx    # KPI summary cards
│   │   └── PayrollTable.tsx    # Employee payroll table
│   ├── lib/
│   │   ├── payroll.ts          # Calculation engine + exports
│   │   └── parser.ts           # File parsing (XLS/XLSX/CSV)
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## Features

| Feature | Description |
|---|---|
| **Auto-parsing** | Reads employee names, dept, days, hours from XLS/XLSX/CSV |
| **Instant calculation** | Gross = (Rate/Day × Days) + (Rate/Hour × OT Multiplier × OT Hours) |
| **Per-employee rates** | Override default rates for specific employees |
| **Inline editing** | Edit hours directly in the table — totals update live |
| **Search & filter** | By name or department |
| **Export CSV** | One-click payroll export with all columns |
| **Print ready** | Clean print stylesheet included |
| **Client-side only** | Zero server uploads, fully private |

---

## Pay Formula

```
Day Pay   = Rate/Day × Days Present
OT Pay    = Rate/Hour × OT Multiplier × OT Hours
Gross Pay = Day Pay + OT Pay
```

---

## Upgrading the Parser

The parser in `app/lib/parser.ts` auto-detects column headers. For your specific biometric system export format, update `extractEmployeesFromRows()` to map the exact column positions for Name, Days, Hours, and OT Hours.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** (custom Apple design tokens)
- **SheetJS (xlsx)** for spreadsheet parsing
- **Lucide React** for icons

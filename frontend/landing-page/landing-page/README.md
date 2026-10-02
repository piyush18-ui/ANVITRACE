# 🛡️ ANVITRACE Standalone Landing Page

A production-ready, fully self-contained official landing page for **ANVITRACE — Offline Cyber-Forensics & Financial Investigation Platform**.

Designed to be:
- **Standalone**: Can be run independently with its own Vite dev server.
- **Portable**: Can be copied directly into **any other React, Next.js, or Vite project** as a modular folder.

---

## 🚀 Quick Start (Running Standalone)

```bash
# 1. Navigate to this folder
cd landing-page

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Visit `http://localhost:5174/` to view the standalone landing page.

---

## 📦 How to Use This in Any Other Project

You can drop the `src/components/` folder into any existing codebase in seconds.

### 1. Copy the Components
Copy the `src/components/` directory into your project, for example at:
```
your-project/
  src/
    components/
      landing/
        LandingPage.tsx
        LandingNavbar.tsx
        HeroSection.tsx
        DashboardMockup.tsx
        ProblemSolutionSection.tsx
        HowItWorksSection.tsx
        CapabilityGrid.tsx
        ProductShowcaseSection.tsx
        IntelligenceSection.tsx
        EvidenceSecuritySection.tsx
        FinalCTASection.tsx
        LandingFooter.tsx
        index.ts
```

### 2. Install Required Dependencies
In your destination project:
```bash
npm install lucide-react
```

Ensure your project has Tailwind CSS enabled, or includes Tailwind CDN script:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

### 3. Import and Render
In any React component, page, or router view:

```tsx
import React from 'react';
import { LandingPage } from './components/landing';

export const MyPage: React.FC = () => {
  const handleLaunch = () => {
    // Navigate to your main application, open a modal, or redirect
    console.log('Launch Investigation triggered!');
    window.location.href = '/app';
  };

  return <LandingPage onLaunchInvestigation={handleLaunch} />;
};
```

---

## 🧩 Modular Component Exports

You can also import and use individual sections independently:

```tsx
import { 
  HeroSection, 
  ProblemSolutionSection, 
  HowItWorksSection, 
  CapabilityGrid, 
  ProductShowcaseSection, 
  IntelligenceSection, 
  EvidenceSecuritySection, 
  FinalCTASection,
  DashboardMockup,
  LandingNavbar,
  LandingFooter 
} from './components/landing';
```

---

## 🎨 Color System & Tokens

- **Primary Navy / Dark Slate**: `#0f172a`, `#0a1128`
- **Accent Electric Blue**: `#2563eb`, `#1d4ed8`
- **Surface / Background**: `#f8f9ff`, `#f8fafc`, `#ffffff`
- **Audit Accents**: Emerald (`#10b981`), Amber (`#f59e0b`), Rose (`#ef4444`)
- **Fonts**: `Inter`, `Hanken Grotesk`, `JetBrains Mono`

---

## ⚖️ License & Provenance

MIT License. Designed for official cyber-forensics & law enforcement financial investigation workflows.

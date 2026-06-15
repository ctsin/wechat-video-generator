---
name: Pro-Editor SaaS
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#464555'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006d33'
  on-secondary: '#ffffff'
  secondary-container: '#66ff95'
  on-secondary-container: '#007437'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#66ff95'
  secondary-fixed-dim: '#45e17c'
  on-secondary-fixed: '#00210b'
  on-secondary-fixed-variant: '#005225'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  chat-text:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 22px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  sidebar-width: 280px
  inspector-width: 320px
  gutter: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style
The design system focuses on high-utility professionalism, bridging the gap between a robust SaaS creative tool and the familiar simplicity of mobile messaging. The aesthetic is rooted in **Corporate Minimalism** with high-tech accents, prioritizing clarity of function and speed of execution.

The brand persona is "The Precision Orchestrator"—reliable, clean, and invisible. The interface utilizes generous whitespace, crisp systematic borders, and a clear hierarchy to reduce cognitive load during complex editing tasks. The emotional response is one of confidence and efficiency, allowing the user to focus entirely on the content generation process.

## Colors
This design system employs a functional split-palette strategy:

- **Primary Indigo (#4F46E5):** Reserved for the "Director" layer—all SaaS dashboard controls, primary actions, navigation, and active states.
- **Emerald Green (#07C160):** Strictly reserved for the "Simulation" layer—WeChat chat bubbles (sender), WeChat Pay icons, and verification badges.
- **Neutrals:** A scale of cool grays (Slate/Gray) ensures the interface feels technical and clean.
- **Simulation Neutrals:** The chat simulator uses a specific `#EDEDED` background and `#FFFFFF` bubbles for the recipient to maintain platform authenticity.

## Typography
The system distinguishes between **Interface Type** and **Simulation Type**:

1.  **Interface (Inter):** Used for all navigation, settings, and labels. It uses tight tracking for headlines and standard tracking for body text to maintain a modern SaaS feel.
2.  **Simulation (System UI):** Inside the iPhone container, typography must fall back to the native system stack (`-apple-system`, `BlinkMacSystemFont`, `Heiti SC`) to ensure the generated video looks indistinguishable from a real screen recording.

Weights are used sparingly: 600 for interaction points and 400 for content.

## Layout & Spacing
The dashboard uses a **Three-Column Fixed-Fluid-Fixed** layout:

- **Left Rail (Fixed):** Navigation and global project settings.
- **Center Canvas (Fluid):** The timeline and message block stack. This area uses a centralized "track" layout to mimic a vertical video sequence.
- **Right Inspector (Fixed):** The iPhone Simulator and real-time configuration panel.

Spacing follows an 8px (0.5rem) linear scale. Gaps between message blocks are kept tight (8px) to reflect a chronological sequence, while dashboard modules are separated by larger gaps (24px) to denote distinct functional areas.

## Elevation & Depth
The design system uses a "Flat Elevation" model with depth reserved for floating overlays:

- **Level 0 (Background):** `#F9FAFB` – The base foundation.
- **Level 1 (Cards/Sidebar):** White surface with a 1px border (`#E5E7EB`). No shadow.
- **Level 2 (Active Message Blocks):** White surface with a subtle `indigo` glow or 2px border.
- **Level 3 (Modals/Popovers):** Soft, diffused ambient shadows (`0 10px 15px -3px rgba(0, 0, 0, 0.1)`) to lift critical actions above the editing canvas.

The WeChat Simulator (iPhone) should have a crisp silhouette with a subtle dark bezel to separate the preview from the dashboard UI.

## Shapes
A "Soft" geometric language is used to maintain professionalism without feeling overly clinical:

- **Dashboard Components:** Buttons and inputs use a 6px (`0.375rem`) radius.
- **Cards/Modules:** Use an 8px (`0.5rem`) radius.
- **WeChat Bubbles:** These follow specific platform rules—4px radius with a small triangular tail on the appropriate side.
- **iPhone Container:** A significant 40px radius on the outer bezel to simulate modern hardware.

## Components

### Dialogue Timeline Blocks
Individual cards representing a single message.
- **Layout:** Avatar thumbnail (left), Name/Role label (top), Text Preview (center).
- **Controls:** Drag-handle on the far left; Delete/Duplicate on hover (far right).
- **State:** Active block features an Indigo left-border accent.

### WeChat Simulator (iPhone)
- **Container:** 19.5:9 aspect ratio, notch/dynamic island at the top.
- **Bubbles:** 
    - *Right (User):* Emerald Green (`#07C160`), white text.
    - *Left (Partner):* White (`#FFFFFF`), black text, subtle 1px border.
- **Footer:** Mock WeChat keyboard/input bar with the "+" and "Mic" icons.

### Dashboard Inputs
- **Fields:** High-contrast white background, 1px gray border, 14px text.
- **Primary Button:** Solid Indigo with white text; no gradients.
- **Secondary Button:** Ghost style with Indigo text and a subtle gray border.

### Pricing/Checkout Modal
- **Visuals:** Centered layout, clean feature checkmarks using Indigo, and a prominent "Start Generating" call to action. 
- **Payment Icons:** Include WeChat Pay (Green) and standard Credit Card options.
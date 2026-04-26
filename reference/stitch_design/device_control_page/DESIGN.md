---
name: Smart Farming Design System
colors:
  surface: '#fbf8ff'
  surface-dim: '#dbd9e1'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2fb'
  surface-container: '#efecf5'
  surface-container-high: '#eae7ef'
  surface-container-highest: '#e4e1ea'
  on-surface: '#1b1b21'
  on-surface-variant: '#454652'
  inverse-surface: '#303036'
  inverse-on-surface: '#f2eff8'
  outline: '#767683'
  outline-variant: '#c6c5d4'
  surface-tint: '#4c56af'
  primary: '#000666'
  on-primary: '#ffffff'
  primary-container: '#1a237e'
  on-primary-container: '#8690ee'
  inverse-primary: '#bdc2ff'
  secondary: '#006493'
  on-secondary: '#ffffff'
  secondary-container: '#00affe'
  on-secondary-container: '#003f5f'
  tertiary: '#380b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#5c1800'
  on-tertiary-container: '#e17c5a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000767'
  on-primary-fixed-variant: '#343d96'
  secondary-fixed: '#cae6ff'
  secondary-fixed-dim: '#8dcdff'
  on-secondary-fixed: '#001e30'
  on-secondary-fixed-variant: '#004b70'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#7b2e12'
  background: '#fbf8ff'
  on-background: '#1b1b21'
  surface-variant: '#e4e1ea'
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin: 32px
---

## Brand & Style

The design system is built on the pillars of precision, reliability, and modern agricultural intelligence. The brand personality is professional and analytical, aiming to evoke a sense of calm control over complex data. It targets agritech operators and farm managers who require high-density information without cognitive overload.

The visual style blends **Minimalism** with subtle **Glassmorphism** to create a sophisticated, tech-forward interface. By utilizing a light, cool-toned environment, the system prioritizes legibility and data clarity, ensuring that critical IoT alerts remain the primary focus. The aesthetic is inspired by contemporary SaaS leaders, favoring functional elegance over decorative elements.

## Colors

The color palette is rooted in cool tones to convey stability and high-tech precision. The **Deep Navy** primary color is used for structural branding and primary actions, while the **Electric Blue** secondary color drives interactivity and secondary highlights. 

The background uses a specific **Grey-Blue** tint to reduce eye strain during long-duration monitoring. Semantic colors are softened to fit the professional aesthetic: **Emerald Green** indicates active machinery and healthy crop metrics, while **Coral Red** is reserved strictly for hardware failures or critical threshold warnings.

## Typography

This design system utilizes **Inter** for its exceptional readability in data-heavy environments. The typographic scale is optimized for high-density IoT dashboards, utilizing varied font weights to establish a clear hierarchy. 

Headlines use tighter letter spacing and heavier weights to anchor page sections, while body text maintains a generous line height for maximum legibility. A specialized "data-display" style is included for primary metric readouts (e.g., soil moisture levels or temperature), ensuring key figures are instantly scannable.

## Layout & Spacing

The system follows a strict **8pt grid system** to ensure mathematical harmony across all components. The layout philosophy is centered on a **fixed-fluid hybrid grid**: navigation sidebars remain fixed, while dashboard modules utilize a fluid 12-column grid.

Generous white space is a core requirement of this design system to prevent the "technical clutter" often found in industrial software. Standard card margins are set to 24px, providing enough "breathing room" to isolate different data streams effectively.

## Elevation & Depth

Visual hierarchy is achieved through a combination of **Glassmorphism** and **Ambient Shadows**. 

The top navigation bar uses a backdrop filter (blur: 12px) with a semi-transparent white fill (opacity: 80%) to create a sense of persistent orientation without blocking content. Dashboard cards avoid heavy borders and instead use highly diffused, low-opacity shadows (Color: Navy, Opacity: 4%, Y-offset: 4px, Blur: 20px) to appear slightly lifted from the grey-blue background. This creates a clean, tiered interface where data surfaces feel light and modern.

## Shapes

The design system employs a **Rounded** shape language to soften the industrial nature of agricultural data. 

The standard corner radius for primary containers and dashboard cards is **12px**. This specific curvature creates a friendly, modern SaaS feel that aligns with the "Professional" style. Smaller elements like buttons and input fields follow this 12px standard, while decorative chips and "iOS-style" toggle switches utilize fully pill-shaped (circular) ends for distinct interactive affordance.

## Components

**Buttons:** Primary buttons feature a subtle linear gradient from Deep Navy to a slightly lighter indigo. Secondary buttons use a cyan outline. All buttons maintain a height of 40px or 48px with 12px rounded corners.

**Toggle Switches:** Inspired by iOS, toggles use a smooth sliding animation. When "ON," the track fills with Soft Emerald Green; when "OFF," it remains a neutral slate grey.

**Cards:** The fundamental building block of the dashboard. Cards are borderless, using the defined ambient shadow and 12px radius. Content inside cards should follow the 16px internal padding rule.

**Input Fields:** Clean, outlined style with a 1px border (#E2E8F0). On focus, the border transitions to Electric Blue with a subtle 2px glow.

**Icons:** Exclusively use Lucide/Feather outline icons with a 2px stroke weight. Icons should be sized to 20px for standard UI actions and 24px for top-level navigation.

**Data Visualizations:** Charts should utilize the primary navy and secondary cyan for data series, using emerald and coral only for threshold indicators. Use soft-edged paths for line charts to match the rounded shape language.
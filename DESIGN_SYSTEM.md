# Flex Tournament Design System

## Color Palette

- **Accent Orange**: `#DE5A26` - CTAs, highlights, active states, key headings
- **Secondary Orange**: `#DD7644` - Secondary accents
- **Rust**: `#A54221` - Darker orange variant
- **Charcoal**: `#1E1F1F` - Dark sections (power/tech moments)
- **Near Black**: `#060403` - Deepest dark
- **Off-White**: `#FAF9F9` - Main background, readability
- **Warm Gray**: `#DFD4CE` - Subtle backgrounds, borders

## Typography

- **Headings**: Oswald/Bebas Neue, ALL CAPS, oblique/italic, wide tracking (0.15em)
- **Body**: Inter, clean sans-serif, generous line-height (1.6)

## Component Classes

### Buttons
- `.btn-primary` - Orange fill, dark text, skewed parallelogram
- `.btn-secondary` - Dark fill, orange border/text, skewed parallelogram
- `.btn-skew` - Base skewed button class

### Cards
- `.card` - White background, clipped corners, orange accent line at top

### Sections
- `.section-diagonal` - Diagonal top/bottom edges (3-6 degrees)
- `.section-diagonal-reverse` - Reverse diagonal

### Tabs
- `.tab-active` - Orange fill, dark text, skewed
- `.tab-inactive` - Dark outline, hover to orange

### Utilities
- `.micro-label` - Uppercase label with orange divider
- `.divider-orange` - Orange accent divider line
- `.texture-halftone` - Subtle halftone texture overlay for dark sections
- `.text-glow-orange` - Orange text glow for dark sections

## Usage Guidelines

1. **Orange** - Only for CTAs, highlights, active states, and key headings (NOT body text)
2. **Dark sections** - Use charcoal/near-black for "power/tech" moments
3. **White/off-white** - For readability and product/info-heavy areas
4. **Geometry** - Use diagonal edges on major sections, skewed buttons consistently
5. **Spacing** - Lots of breathing room on light sections, tighter on dark sections

## Tailwind Classes

Use these Tailwind classes directly:
- `bg-accent-orange`, `text-accent-orange`
- `bg-dark-charcoal`, `text-dark-charcoal`
- `bg-dark-near-black`, `text-dark-near-black`
- `bg-light-off-white`, `bg-light-warm-gray`
- `font-heading`, `font-body`
- `tracking-wide-heading`, `tracking-extra-wide`


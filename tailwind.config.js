/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Flat tokens for direct utility usage (e.g. bg-light-off-white)
        'accent-orange': '#DE5A26',
        'accent-orange-secondary': '#DD7644',
        'accent-rust': '#A54221',
        'dark-charcoal': '#1E1F1F',
        'dark-near-black': '#060403',
        'light-off-white': '#FAF9F9',
        'light-warm-gray': '#DFD4CE',

        // Grouped tokens for semantic usage
        accent: {
          orange: '#DE5A26',
          'orange-secondary': '#DD7644',
          rust: '#A54221',
        },
        dark: {
          charcoal: '#1E1F1F',
          'near-black': '#060403',
        },
        light: {
          'off-white': '#FAF9F9',
          'warm-gray': '#DFD4CE',
        },
        // Keep sport colors for backward compatibility, map to new palette
        sport: {
          orange: '#DE5A26',
          green: '#4ECDC4', // Keep for specific use cases
          dark: '#1E1F1F',
          light: '#FAF9F9',
        },
      },
      fontFamily: {
        heading: ['Oswald', 'Bebas Neue', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'wide-heading': '0.15em',
        'extra-wide': '0.25em',
      },
      skew: {
        'subtle': '3deg',
        'medium': '6deg',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#D22630", // Ninja Red -- chrome only: header, logo, active nav, primary buttons. Never a data signal.
          dark: "#A81E27",
          legacy: "#C2002F", // Legacy Ninja Red, per brand guidelines
        },
        ink: {
          DEFAULT: "#231F20", // Ninja Black -- body text, table header bar, app header bar
        },
        status: {
          // Deliberately distinct from brand red so "critical" never reads as "on-brand".
          critical: "#8C1D18",
          warning: "#B45309",
          good: "#166534",
          neutral: "#475569",
        },
      },
      fontFamily: {
        display: ["Montserrat", "ui-sans-serif", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

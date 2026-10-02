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
          tint: "#FDECEC", // active nav item background -- chrome only (design review D1)
        },
        ink: {
          DEFAULT: "#231F20", // Ninja Black -- body text, table header bar, app header bar
          2: "#3D4550", // secondary text, nav default
        },
        muted: "#5B6470", // captions, labels (>= 4.5:1 on white)
        subtle: "#6B7280", // micro-labels, counts
        line: "#E6E8EB", // card ring, dividers
        canvas: "#F4F5F7", // page background
        row: { region: "#EEF0F3", zone: "#F7F8FA", selected: "#E8EEF6" }, // hierarchy row fills; selected station row is cool, never red
        "ref-header": "#9AA1AA", // reference-column header text / target line on the ink table header (design review D1)
        status: {
          // Deliberately distinct from brand red so "critical" never reads as "on-brand".
          critical: "#8C1D18",
          warning: "#B45309",
          good: "#166534",
          neutral: "#475569",
          "critical-fill": "#FBEAE8", // tinted cell background behind a critical value (design review D1/D5)
          "warning-fill": "#FEF3E2",
        },
      },
      boxShadow: {
        card: "0 0 0 1px #E6E8EB, 0 1px 2px rgba(35,31,32,.06)",
        panel: "-8px 0 24px rgba(35,31,32,.08)",
      },
      fontFamily: {
        display: ["Montserrat", "ui-sans-serif", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

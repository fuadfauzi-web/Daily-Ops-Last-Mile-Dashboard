/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        status: {
          good: "#0ca30c",
          warning: "#fab219",
          serious: "#ec835a",
          critical: "#d03b3b",
        },
        series1: "#2a78d6",
        brand: {
          DEFAULT: "#E4002B",
          dark: "#B4001F",
        },
      },
    },
  },
  plugins: [],
};

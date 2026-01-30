import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FAF7F2",
        sand: "#E8E2D8",
        terracotta: {
          DEFAULT: "#C17F59",
          dark: "#A04D2E",
          light: "#E4B8A0",
        },
        sage: {
          DEFAULT: "#6B7C5C",
          dark: "#4A5D3D",
          light: "#9BAB8A",
        },
        ink: "#2C2416",
        muted: "#6B6560",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

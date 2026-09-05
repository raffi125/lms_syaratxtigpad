import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        syarat: {
          DEFAULT: "#163C8A",
          light: "#2557c4",
          dark: "#0d265c",
        },
        tigpad: {
          DEFAULT: "#F97316",
          light: "#fb923c",
          dark: "#c2410c",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Playfair Display", "serif"],
        cinzel: ["Cinzel", "serif"],
        cursive: ["Great Vibes", "cursive"],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"],
    base: true,
    styled: true,
    utils: true,
  },
};
export default config;

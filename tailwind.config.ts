import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#05090d",
          900: "#081116",
          850: "#0b171d",
          800: "#0f2027",
          700: "#17313b"
        },
        aqua: {
          100: "#c8fff8",
          300: "#62f5ea",
          400: "#22d3c5",
          500: "#08a9a3"
        },
        ember: {
          400: "#ff8b5f",
          500: "#f46d43"
        },
        bayou: {
          50: "#eefdf8",
          100: "#d5f7ed",
          500: "#14a37f",
          600: "#0f8268",
          700: "#0f6754",
          900: "#0b3b32"
        },
        cypress: "#17362f",
        gold: "#d99b32"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 39, 35, 0.08)",
        glass: "0 24px 80px rgba(0, 0, 0, 0.35)",
        glow: "0 0 40px rgba(34, 211, 197, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;

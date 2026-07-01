import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
        soft: "0 10px 30px rgba(15, 39, 35, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e1a",
        card: "rgba(255,255,255,0.04)",
        "card-border": "rgba(255,255,255,0.08)",
        "text-muted": "rgba(255,255,255,0.35)",
        "text-subtle": "rgba(255,255,255,0.22)",
      },
    },
  },
  plugins: [],
};

export default config;

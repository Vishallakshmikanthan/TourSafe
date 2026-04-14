import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "ts-navy": "#1A3C6E",
        "ts-saffron": "#FF6B00",
        "ts-green": "#046A38",
        "ts-teal": "#0D7680",
        "ts-slate": "#4A5568",
        "ts-light": "#F7F8FA",
        "ts-mid": "#E2E8F0",
        "ts-alert-red": "#C53030",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1A3C6E",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#0D7680",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#C53030",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#F7F8FA",
          foreground: "#4A5568",
        },
        accent: {
          DEFAULT: "#FF6B00",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "sos-pulse": "sos-pulse 1.5s ease-in-out infinite",
        "status-blink": "status-blink 1s step-end infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out",
      },
      keyframes: {
        "sos-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(197,48,48,0.7)" },
          "50%": { boxShadow: "0 0 0 20px rgba(197,48,48,0)" },
        },
        "status-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

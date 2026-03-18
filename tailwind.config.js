/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          white: "rgba(255,255,255,0.08)",
          border: "rgba(255,255,255,0.12)",
          hover: "rgba(255,255,255,0.14)",
        },
        brand: {
          50: "#f0f4ff",
          100: "#e0eaff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      backgroundImage: {
        "gradient-mesh":
          "radial-gradient(at 40% 20%, hsla(251,91%,62%,0.18) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.12) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.08) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(240,100%,70%,0.12) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(22,100%,77%,0.06) 0px, transparent 50%)",
      },
      backdropBlur: {
        glass: "16px",
      },
      boxShadow: {
        glass: "0 4px 32px 0 rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.1)",
        "glass-hover": "0 8px 48px 0 rgba(99,102,241,0.32), inset 0 1px 0 rgba(255,255,255,0.14)",
        card: "0 2px 16px 0 rgba(0,0,0,0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 8px rgba(99,102,241,0.4)" },
          "50%": { boxShadow: "0 0 24px rgba(99,102,241,0.8)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

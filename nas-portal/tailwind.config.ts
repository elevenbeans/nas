import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Poppins", "sans-serif"],
        body: ["Roboto", "sans-serif"],
      },
      colors: {
        "apple-bg": "#fbfbfd",
        "apple-text": "#1d1d1f",
        "apple-muted": "#86868b",
        "clean-blue": "#3b82f6",
      },
      borderRadius: {
        "apple": "18px",
      },
    },
  },
  plugins: [],
};

export default config;

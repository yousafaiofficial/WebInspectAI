import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        mist: "#f4f7fb",
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          500: "#1685e6",
          600: "#0872ca",
          700: "#075da5",
        },
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px rgba(15, 23, 42, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;

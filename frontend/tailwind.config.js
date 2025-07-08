import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        black: {
          primary: "rgb(29, 155, 240)",
          secondary: "rgb(24, 24, 24)",
          accent: "#37cdbe",
          neutral: "#3d4451",
          "base-100": "#1f2937",
          info: "#2094f3",
          success: "#009485",
          warning: "#ff9900",
          error: "#ff5724",
        },
      },
    ],
    darkTheme: "black",
  },
};

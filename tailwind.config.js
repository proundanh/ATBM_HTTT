/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#f0fdf4', 500: '#10b981', 900: '#064e3b' },
        slate: { 850: '#151f32', 900: '#0f172a' }
      }
    },
  },
  plugins: [],
}

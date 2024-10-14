const colors = require("tailwindcss/colors");
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        //just add this below and your all other tailwind colors willwork
        ...colors,
      },
    },
  },
  plugins: [],
};

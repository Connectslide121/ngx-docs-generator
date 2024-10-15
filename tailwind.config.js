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
      typography: (theme) => ({
        DEFAULT: {
          css: {
            /* Custom styles for inline code */
            code: {
              backgroundColor: theme("colors.gray.100"),
              color: theme("colors.pink.600"),
              padding: "0.2em 0.4em",
              borderRadius: "0.25rem",
              fontWeight: "400",
              fontSize: "0.95em",
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            },
            "code::before": {
              content: "none",
            },
            "code::after": {
              content: "none",
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

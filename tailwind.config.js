/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        qban: {
          yellow: "#F5C518",
          "yellow-light": "#FFD94A",
          "yellow-pale": "#FFF3C4",
          black: "#1A1A1A",
          charcoal: "#2D2D2D",
          "dark-brown": "#3D2B1F",
          "cigar-brown": "#8B6914",
          tobacco: "#C4A265",
          tan: "#D4B896",
          cream: "#F5E6CC",
          red: "#CC2936",
          smoke: "#E8E4DF",
          "smoke-dark": "#B8B2AA",
          white: "#FAFAF8",
          green: "#00C853",
          "green-accent": "#00C853",
          "red-accent": "#FF1744",
        },
      },
      fontFamily: {
        "bebas": ["BebasNeue"],
        "space": ["SpaceMono"],
        "dm": ["DMSans"],
        "dm-medium": ["DMSans-Medium"],
        "dm-bold": ["DMSans-Bold"],
      },
    },
  },
  plugins: [],
};

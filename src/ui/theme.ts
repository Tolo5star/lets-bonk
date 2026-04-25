// Mood board color palette
export const colors = {
  // Backgrounds
  bgDark: "#1a1a2e",
  bgPanel: "#2a2a4a",
  bgCard: "#33335a",
  bgWarm: "#3d2b5a",

  // Characters / accents
  pink: "#ff6b9d",
  pinkLight: "#ff9ec4",
  blue: "#4ecdc4",
  blueLight: "#7fede6",
  green: "#55efc4",
  greenLight: "#81ffd9",
  yellow: "#ffeaa7",
  yellowBright: "#fdcb6e",
  orange: "#ff9f43",
  red: "#ff6b6b",
  redBright: "#ff4757",
  purple: "#a29bfe",
  purpleLight: "#c8b6ff",

  // Text
  textLight: "#f0e6d3",
  textMuted: "rgba(240, 230, 211, 0.5)",
  textDark: "#2d1b4e",

  // UI
  border: "rgba(255, 255, 255, 0.12)",
  overlay: "rgba(26, 26, 46, 0.85)",
};

// Font families
export const fonts = {
  display: "'Lilita One', 'Nunito', sans-serif", // Big chunky headings
  body: "'Nunito', system-ui, sans-serif", // Rounded body text
};

// Reusable style patterns
export const shadows = {
  text: "2px 2px 0 rgba(0,0,0,0.3), 4px 4px 0 rgba(0,0,0,0.1)",
  textGlow: (color: string) =>
    `0 0 10px ${color}, 0 0 20px ${color}, 2px 2px 0 rgba(0,0,0,0.3)`,
  box: "0 4px 15px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)",
  boxLifted: "0 8px 25px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3)",
};

export function chunkyButton(
  bgColor: string,
  textColor: string,
  borderColor?: string
): React.CSSProperties {
  return {
    padding: "14px 32px",
    fontSize: "1.1rem",
    fontFamily: fonts.display,
    fontWeight: "bold",
    letterSpacing: "1px",
    border: `3px solid ${borderColor || bgColor}`,
    borderRadius: "16px",
    background: bgColor,
    color: textColor,
    cursor: "pointer",
    boxShadow: `0 4px 0 ${darken(borderColor || bgColor)}, ${shadows.box}`,
    transform: "translateY(0)",
    transition: "transform 0.1s, box-shadow 0.1s",
    textTransform: "uppercase" as const,
  };
}

function darken(hex: string): string {
  // Simple darken for button bottom shadow
  return hex + "88";
}

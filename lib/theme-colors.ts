// Utility to generate theme-aware class names
export const themeClasses = {
  // Backgrounds
  bg: {
    primary: "bg-white dark:bg-neutral-950",
    secondary: "bg-gray-50 dark:bg-neutral-900",
    tertiary: "bg-gray-100 dark:bg-neutral-800",
    card: "bg-white dark:bg-neutral-900",
    input: "bg-gray-50 dark:bg-neutral-800",
    hover: "hover:bg-gray-100 dark:hover:bg-neutral-800",
  },
  
  // Text colors
  text: {
    primary: "text-gray-900 dark:text-neutral-100",
    secondary: "text-gray-600 dark:text-neutral-400",
    tertiary: "text-gray-500 dark:text-neutral-500",
    muted: "text-gray-400 dark:text-neutral-600",
  },
  
  // Borders
  border: {
    primary: "border-gray-200 dark:border-neutral-800",
    secondary: "border-gray-300 dark:border-neutral-700",
    focus: "focus:ring-indigo-500 dark:focus:ring-indigo-500",
  },
  
  // Buttons
  button: {
    primary: "bg-indigo-600 dark:bg-indigo-600/90 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600",
    secondary: "bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-300 dark:hover:bg-neutral-700",
    danger: "bg-red-600 dark:bg-red-600/90 text-white hover:bg-red-700 dark:hover:bg-red-600",
    success: "bg-green-600 dark:bg-green-600/90 text-white hover:bg-green-700 dark:hover:bg-green-600",
  },
};
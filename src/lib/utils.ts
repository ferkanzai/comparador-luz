import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/* The app's type scale adds steps Tailwind doesn't know (globals.css). */
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["3xs", "2xs", "xs-plus", "sm-plus"] } },
});

/** Joins class names, letting later Tailwind classes override earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

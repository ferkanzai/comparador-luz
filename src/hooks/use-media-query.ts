"use client";
import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches, kept in sync as the window changes. On the
 * server it assumes a match: dialogs only open after the page is interactive.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}

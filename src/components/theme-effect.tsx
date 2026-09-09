"use client";

import { useEffect } from "react";

export function ThemeEffect({ appearance }: { appearance: "light" | "dark" | "system" }) {
  useEffect(() => {
    if (appearance === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = appearance;
  }, [appearance]);
  return null;
}

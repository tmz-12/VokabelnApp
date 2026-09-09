"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/** Keep the URL shareable while retaining focus during incremental search. */
export function SearchForm({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function navigate(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) if (typeof value === "string" && value) params.set(key, value);
    router.replace(`/search?${params}`, { scroll: false });
  }
  return <form className="search-tools" onSubmit={(event) => {
    event.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    navigate(event.currentTarget);
  }} onChange={(event) => {
    if (timer.current) clearTimeout(timer.current);
    const form = event.currentTarget;
    timer.current = setTimeout(() => navigate(form), 300);
  }}>{children}</form>;
}

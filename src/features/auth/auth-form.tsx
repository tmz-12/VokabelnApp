"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { signIn, signUp } from "@/lib/auth-client";

export function AuthForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "register">("sign-in");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    try {
      const result = mode === "register"
        ? await signUp.email({ email, password, name: String(form.get("name")) })
        : await signIn.email({ email, password });
      if (result.error) { setError(t("error")); return; }
      router.push(mode === "register" ? "/onboarding" : "/home", { locale });
    } catch { setError(t("error")); }
    finally { setPending(false); }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div><h2 className="form-heading">{mode === "sign-in" ? t("signIn") : t("register")}</h2></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {mode === "register" && <div className="field"><label htmlFor="name">{t("name")}</label><input className="input" id="name" name="name" autoComplete="name" required maxLength={100} /></div>}
      <div className="field"><label htmlFor="email">{t("email")}</label><input className="input" id="email" name="email" type="email" autoComplete="email" required /></div>
      <div className="field"><label htmlFor="password">{t("password")}</label><div className="password-wrap"><input className="input" id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={8} maxLength={128} required aria-describedby="password-hint" /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("hidePassword") : t("showPassword")}>{showPassword ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}</button></div><span id="password-hint" className="helper">{t("passwordHint")}</span></div>
      <button className="button button-primary" type="submit" disabled={pending}>{pending ? "…" : mode === "sign-in" ? t("signIn") : t("register")}</button>
      <p className="auth-switch">{mode === "sign-in" ? t("newHere") : t("already")} <button type="button" onClick={() => { setMode((value) => value === "sign-in" ? "register" : "sign-in"); setError(""); }}>{mode === "sign-in" ? t("register") : t("signIn")}</button></p>
    </form>
  );
}

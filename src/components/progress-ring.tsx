export function ProgressRing({ value, label, count, tone = "moss" }: { value: number; label: string; count?: string; tone?: "moss" | "cobalt" }) {
  const clamped = Math.max(0, Math.min(100, value));
  return <div className={`progress-ring ${tone}`} style={{ "--ring": `${clamped * 3.6}deg` } as React.CSSProperties} role="img" aria-label={`${label}: ${clamped}%${count ? `, ${count}` : ""}`}><span><strong className="tabular">{clamped}%</strong><small>{label}</small>{count && <small className="tabular">{count}</small>}</span></div>;
}

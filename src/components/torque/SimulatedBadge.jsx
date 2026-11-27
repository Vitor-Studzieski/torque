import { FlaskConical } from "lucide-react";
export function SimulatedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-info">
      <FlaskConical className="size-3" aria-hidden /> Simulado
    </span>
  );
}

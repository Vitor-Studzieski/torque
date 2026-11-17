import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <GlassCard className="relative flex flex-col items-center gap-3 overflow-hidden px-6 py-14 text-center">
      <div className="tech-grid absolute inset-0 opacity-70" aria-hidden />
      <span className="relative grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary shadow-glow">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="relative text-lg font-bold">{title}</h3>
      {description && (
        <p className="relative max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="relative mt-2">{action}</div>}
    </GlassCard>
  );
}

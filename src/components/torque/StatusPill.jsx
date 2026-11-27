import { CheckCircle2, AlertTriangle, XCircle, Info, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
const TONES = {
  success: { cls: "bg-success/12 text-success border-success/25", icon: CheckCircle2 },
  warning: { cls: "bg-warning/12 text-warning border-warning/25", icon: AlertTriangle },
  danger: { cls: "bg-danger/12 text-danger border-danger/25", icon: XCircle },
  info: { cls: "bg-info/12 text-info border-info/25", icon: Info },
  neutral: { cls: "bg-muted text-muted-foreground border-border", icon: Clock },
  primary: { cls: "bg-primary/12 text-primary border-primary/25", icon: Clock },
};
/** Status always shown with text + icon, never color alone. */
export function StatusPill({ tone, children, icon, className }) {
  const t = TONES[tone];
  const Icon = icon ?? t.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        t.cls,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

import { cn } from "@/lib/utils";
export function GlassCard({ className, ...p }) {
  return <div className={cn("glass rounded-2xl", className)} {...p} />;
}

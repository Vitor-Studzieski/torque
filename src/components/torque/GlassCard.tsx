import { cn } from "@/lib/utils";
export function GlassCard({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-2xl", className)} {...p} />;
}

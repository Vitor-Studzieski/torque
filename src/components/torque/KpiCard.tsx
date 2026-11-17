import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useMotionLevel } from "@/lib/motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { GlassCard } from "./GlassCard";

function Sparkline({ data }: { data: number[] }) {
  const motionLevel = useMotionLevel();
  const max = Math.max(...data),
    min = Math.min(...data);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 26}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <motion.polyline
        points={pts}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={motionLevel === "full" ? { pathLength: 0 } : false}
        animate={motionLevel === "off" ? false : { pathLength: 1 }}
        transition={{ duration: motionLevel === "full" ? 1.2 : 0, ease: "easeOut" }}
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  spark,
  format,
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  spark: number[];
  format?: (n: number) => string;
  hint?: string;
}) {
  return (
    <GlassCard className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-medium">{label}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="font-mono text-2xl font-bold tracking-tight">
        <AnimatedNumber value={value} format={format} />
      </div>
      <Sparkline data={spark} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </GlassCard>
  );
}

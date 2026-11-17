import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useMotionLevel } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Card that tilts toward the cursor with a specular highlight. */
export function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const level = useMotionLevel();
  const x = useMotionValue(0.5),
    y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 250, damping: 20 });
  const ry = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 250, damping: 20 });
  const glare = useTransform(
    [x, y],
    ([a, b]) =>
      `radial-gradient(circle at ${(a as number) * 100}% ${(b as number) * 100}%, var(--glass-highlight), transparent 55%)`,
  );
  const on = level === "full";
  return (
    <div style={{ perspective: 900 }}>
      <motion.div
        ref={ref}
        onPointerMove={(e) => {
          if (!on || !ref.current) return;
          const r = ref.current.getBoundingClientRect();
          x.set((e.clientX - r.left) / r.width);
          y.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          x.set(0.5);
          y.set(0.5);
        }}
        style={on ? { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" } : {}}
        className={cn("glass relative rounded-2xl", className)}
      >
        {on && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ background: glare }}
          />
        )}
        <div style={on ? { transform: "translateZ(24px)" } : undefined}>{children}</div>
      </motion.div>
    </div>
  );
}

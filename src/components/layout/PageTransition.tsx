import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { EASE, useMotionLevel } from "@/lib/motion";

/** Module change: new screen advances from depth (translateZ + slight rotateY). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const level = useMotionLevel();
  const variants =
    level === "full"
      ? { initial: { opacity: 0, z: -120, rotateY: -6, y: 12 }, animate: { opacity: 1, z: 0, rotateY: 0, y: 0 } }
      : level === "reduced"
        ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
        : { initial: { opacity: 1 }, animate: { opacity: 1 } };
  return (
    <div style={{ perspective: 1400 }}>
      <motion.div
        key={path}
        initial="initial" animate="animate" variants={variants}
        transition={{ duration: level === "full" ? 0.55 : 0.25, ease: EASE }}
        style={{ transformOrigin: "50% 0%" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

import { useReducedMotion } from "framer-motion";
import { usePrefs } from "@/stores/preferences.store";

/** Effective motion level: user setting, downgraded by OS prefers-reduced-motion. */
export function useMotionLevel() {
  const pref = usePrefs((s) => s.motion);
  const osReduce = useReducedMotion();
  if (pref === "off") return "off" as const;
  if (osReduce || pref === "reduced") return "reduced" as const;
  return "full" as const;
}

export const EASE = [0.22, 1, 0.36, 1] as const;

import { useEffect, useState } from "react";
import { animate } from "framer-motion";
import { useMotionLevel } from "@/lib/motion";
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("pt-BR") }) {
  const level = useMotionLevel();
  const [n, setN] = useState(level === "full" ? 0 : value);
  useEffect(() => {
    if (level !== "full") {
      setN(value);
      return;
    }
    const c = animate(0, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: setN });
    return () => c.stop();
  }, [value, level]);
  return <span className="tabular">{format(n)}</span>;
}

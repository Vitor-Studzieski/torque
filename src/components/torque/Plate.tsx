import { cn } from "@/lib/utils";

/** Stylized Mercosul plate — Torque's recurring visual signature. */
export function Plate({
  value,
  size = "md",
  className,
}: {
  value: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const s = {
    sm: "text-[11px] min-w-[78px]",
    md: "text-sm min-w-[96px]",
    lg: "text-2xl min-w-[180px]",
  }[size];
  return (
    <span
      className={cn(
        "inline-flex flex-col overflow-hidden rounded-md border border-plate-fg/30 bg-plate-bg text-plate-fg shadow-sm",
        s,
        className,
      )}
      aria-label={`Placa ${value}`}
    >
      <span className="flex items-center justify-between bg-plate-band px-1.5 text-[0.45em] font-bold uppercase leading-[1.6] tracking-widest text-plate-bg">
        <span>Brasil</span>
        <span aria-hidden>▪</span>
      </span>
      <span className="px-2 py-0.5 text-center font-mono font-bold tracking-[0.12em]">
        {value.toUpperCase()}
      </span>
    </span>
  );
}

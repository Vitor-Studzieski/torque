import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const photoSurfaces = [
  "from-slate-700 via-slate-500 to-amber-950",
  "from-zinc-800 via-stone-600 to-orange-950",
  "from-slate-800 via-slate-600 to-sky-950",
  "from-neutral-800 via-neutral-600 to-emerald-950",
  "from-stone-700 via-zinc-500 to-rose-950",
];

export function DemoPhoto({
  variant = 0,
  title,
  caption,
  className,
  compact = false,
}: {
  variant?: number;
  title: string;
  caption?: string;
  className?: string;
  compact?: boolean;
}) {
  const surface = photoSurfaces[Math.abs(variant) % photoSurfaces.length]!;
  return (
    <div
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br",
        surface,
        compact ? "aspect-[4/3]" : "aspect-[16/10]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_35%,rgba(255,255,255,.12)_50%,transparent_65%)] opacity-70 transition-transform duration-700 group-hover:scale-110" />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <svg
        aria-hidden
        viewBox="0 0 480 240"
        className="absolute inset-x-0 bottom-[12%] h-[70%] w-full drop-shadow-2xl"
      >
        <path
          d="M60 150h28l24-44c7-13 18-20 33-23l56-11 39-35c9-8 19-12 31-12h49c17 0 29 7 39 20l33 43 31 11c16 6 26 20 26 37v21h-30a34 34 0 0 0-68 0h-164a34 34 0 0 0-68 0H60z"
          fill="rgba(13,17,22,.82)"
          stroke="rgba(255,255,255,.78)"
          strokeWidth="3"
        />
        <path
          d="m204 79 35-31c8-7 16-10 27-10h39c12 0 21 5 28 15l22 31z"
          fill="rgba(190,205,216,.26)"
          stroke="rgba(255,255,255,.4)"
          strokeWidth="2"
        />
        <circle
          cx="141"
          cy="157"
          r="22"
          fill="#0b0d10"
          stroke="rgba(255,255,255,.85)"
          strokeWidth="4"
        />
        <circle cx="141" cy="157" r="8" fill="#9aa6af" />
        <circle
          cx="386"
          cy="157"
          r="22"
          fill="#0b0d10"
          stroke="rgba(255,255,255,.85)"
          strokeWidth="4"
        />
        <circle cx="386" cy="157" r="8" fill="#9aa6af" />
        <path d="M66 148h39m294 0h28" stroke="#ff6a2b" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 sm:p-4">
        <div className="min-w-0 text-white">
          <p className="truncate text-sm font-bold">{title}</p>
          {caption && <p className="mt-0.5 truncate text-xs text-white/70">{caption}</p>}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-2 py-1 text-[10px] font-semibold text-white/80">
          <Camera className="size-3" /> Demonstração
        </span>
      </div>
    </div>
  );
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
        <svg viewBox="0 0 24 24" className="size-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="7" /><path d="M12 5v4M12 15v4M5 12h4M15 12h4" />
        </svg>
      </span>
      {!collapsed && <span className="text-lg font-extrabold tracking-tight">Torque</span>}
    </span>
  );
}

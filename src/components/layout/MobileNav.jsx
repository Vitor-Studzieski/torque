import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isActive, NAV } from "./navigation";
import { useMotionLevel } from "@/lib/motion";
import { canAccessPath } from "@/lib/permissions";
import { usePrefs } from "@/stores/preferences.store";
import { cn } from "@/lib/utils";
export function MobileNav({ profile: profileProp }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const storedProfile = usePrefs((s) => s.profile);
  const profile = profileProp ?? storedProfile;
  const motionLevel = useMotionLevel();
  const [more, setMore] = useState(false);
  const visibleNav = NAV.filter((item) => canAccessPath(profile, item.to));
  const main = visibleNav.filter((n) => n.mobile);
  const rest = visibleNav.filter((n) => !n.mobile);
  const restActive = rest.some((n) => isActive(path, n.to));
  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Módulos"
        style={{
          gridTemplateColumns: `repeat(${main.length + (rest.length ? 1 : 0)}, minmax(0, 1fr))`,
        }}
      >
        {main.map((n) => {
          const a = isActive(path, n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground",
                a && "text-primary",
              )}
            >
              {a && (
                <motion.span
                  layoutId="mnav"
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-primary"
                  transition={{ duration: motionLevel === "full" ? 0.2 : 0 }}
                />
              )}
              <n.icon className="size-5" aria-hidden />
              <span className="max-w-full truncate px-1">{n.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        {rest.length > 0 && (
          <button
            onClick={() => setMore(true)}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground",
              restActive && "text-primary",
            )}
          >
            <MoreHorizontal className="size-5" aria-hidden /> Mais
          </button>
        )}
      </nav>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Mais módulos</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 p-4">
            {rest.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMore(false)}
                className="glass flex h-20 flex-col items-start justify-center gap-2 rounded-2xl px-4 text-sm font-semibold"
              >
                <n.icon className="size-5 text-primary" aria-hidden /> {n.label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

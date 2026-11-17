import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV } from "@/lib/nav";
import { usePrefs } from "@/lib/prefs";
import { Logo } from "@/components/torque/Logo";
import { cn } from "@/lib/utils";

export function isActive(path: string, to: string) {
  return to === "/app" ? path === "/app" || path === "/app/" : path.startsWith(to);
}

export function Sidebar() {
  const collapsed = usePrefs((s) => s.sidebarCollapsed);
  const toggle = usePrefs((s) => s.toggleSidebar);
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="sticky top-7 hidden h-[calc(100vh-1.75rem)] shrink-0 flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-xl lg:flex"
    >
      <div className="flex h-16 items-center px-5"><Link to="/" aria-label="Torque — início"><Logo collapsed={collapsed} /></Link></div>
      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Módulos">
        {NAV.map((n) => {
          const active = isActive(path, n.to);
          return (
            <Link
              key={n.to} to={n.to} title={collapsed ? n.label : undefined}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "text-sidebar-accent-foreground",
              )}
            >
              {active && (
                <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-sidebar-accent ring-1 ring-primary/30" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
              )}
              {active && <motion.span layoutId="nav-bar" className="absolute left-0 top-2 h-6 w-[3px] rounded-full bg-primary" />}
              <n.icon className={cn("relative size-[18px] shrink-0", active && "text-primary")} aria-hidden />
              {!collapsed && <span className="relative truncate">{n.label}</span>}
            </Link>
          );
        })}
      </nav>
      <button onClick={toggle} className="m-3 flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-sidebar-accent" aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
        {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
        {!collapsed && "Recolher"}
      </button>
    </motion.aside>
  );
}

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Plus, UserPlus, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROFILES, usePrefs, type Profile } from "@/lib/prefs";
import { simulate } from "@/lib/simulated";
import { Logo } from "@/components/torque/Logo";
import { CommandMenu } from "./CommandMenu";

export function Topbar() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, profile, setProfile } = usePrefs();
  return (
    <header className="sticky top-7 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="lg:hidden" aria-label="Torque — início"><Logo collapsed /></Link>
        <button
          onClick={() => setOpen(true)}
          className="glass flex h-10 flex-1 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:max-w-sm"
        >
          <Search className="size-4" aria-hidden />
          <span className="truncate">Buscar OS, placa, cliente…</span>
          <kbd className="ml-auto hidden rounded-md border border-border px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
        </button>
        <div className="ml-auto hidden items-center gap-1.5 xl:flex">
          <Button variant="glow" size="sm" asChild><Link to="/app/ordens"><Plus /> Nova OS</Link></Button>
          <Button variant="ghost" size="sm" asChild><Link to="/app/clientes"><UserPlus /> Adicionar cliente</Link></Button>
          <Button variant="ghost" size="sm" onClick={() => simulate("Entrada registrada")}><LogIn /> Registrar entrada</Button>
          <Button variant="ghost" size="sm" onClick={() => simulate("Saída registrada")}><LogOut /> Registrar saída</Button>
        </div>
        <Select value={profile} onValueChange={(v) => setProfile(v as Profile)}>
          <SelectTrigger className="hidden h-10 w-[140px] rounded-xl md:flex" aria-label="Perfil"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PROFILES).map(([k, p]) => <SelectItem key={k} value={k}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="glass" size="icon" className="size-10" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Alternar tema">
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </div>
      <CommandMenu open={open} setOpen={setOpen} />
    </header>
  );
}

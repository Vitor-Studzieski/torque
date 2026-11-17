import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, UserPlus, LogIn, LogOut } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { NAV } from "@/lib/nav";
import { simulate } from "@/lib/simulated";

export function CommandMenu({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(!open); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, setOpen]);
  const go = (to: string) => { setOpen(false); navigate({ to }); };
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar módulo, OS, placa ou cliente…" />
      <CommandList>
        <CommandEmpty>Nada encontrado. Tente outra placa ou nome.</CommandEmpty>
        <CommandGroup heading="Ações rápidas">
          <CommandItem onSelect={() => go("/app/ordens")}><Plus /> Nova OS</CommandItem>
          <CommandItem onSelect={() => go("/app/clientes")}><UserPlus /> Adicionar cliente</CommandItem>
          <CommandItem onSelect={() => { setOpen(false); simulate("Entrada registrada"); }}><LogIn /> Registrar entrada</CommandItem>
          <CommandItem onSelect={() => { setOpen(false); simulate("Saída registrada"); }}><LogOut /> Registrar saída</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Módulos">
          {NAV.map((n) => <CommandItem key={n.to} onSelect={() => go(n.to)}><n.icon /> {n.label}</CommandItem>)}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

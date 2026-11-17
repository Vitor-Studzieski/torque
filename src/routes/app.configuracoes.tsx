import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/torque/PageHeader";
import { GlassCard } from "@/components/torque/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrefs, type MotionLevel } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({ meta: [
    { title: "Configurações — Torque" }, { name: "description", content: "Dados da oficina, tema e animações." },
    { property: "og:title", content: "Configurações — Torque" }, { property: "og:description", content: "Dados da oficina, tema e animações." },
  ] }),
  component: Settings,
});

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-muted p-1" role="radiogroup">
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={cn("flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-muted-foreground transition-all", value === o.v && "bg-background text-foreground shadow-card")}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

function Settings() {
  const { theme, setTheme, motion, setMotion } = usePrefs();
  return (
    <>
      <PageHeader title="Configurações" description="Preferências salvas neste navegador." />
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-6">
          <h2 className="font-bold">Dados da oficina</h2>
          <div className="space-y-2"><Label htmlFor="n">Nome da oficina *</Label><Input id="n" defaultValue="Auto Center Exemplo" /></div>
          <div className="space-y-2"><Label htmlFor="c">CNPJ (fictício)</Label><Input id="c" defaultValue="00.000.000/0001-00" className="font-mono" /></div>
          <div className="space-y-2"><Label htmlFor="t">Telefone</Label><Input id="t" defaultValue="(11) 4000-0000" className="font-mono" /></div>
          <Button variant="glow" onClick={() => toast.success("Dados da oficina salvos")}>Salvar</Button>
        </GlassCard>
        <GlassCard className="space-y-6 p-6">
          <div className="space-y-2">
            <h2 className="font-bold">Tema</h2>
            <Seg value={theme} onChange={setTheme} options={[{ v: "dark", label: "Escuro", icon: <Moon className="size-4" /> }, { v: "light", label: "Claro", icon: <Sun className="size-4" /> }]} />
          </div>
          <div className="space-y-2">
            <h2 className="font-bold">Intensidade das animações</h2>
            <Seg<MotionLevel> value={motion} onChange={(m) => { setMotion(m); toast.success("Preferência de animação salva"); }}
              options={[{ v: "full", label: "Completa" }, { v: "reduced", label: "Reduzida" }, { v: "off", label: "Desligada" }]} />
            <p className="text-xs text-muted-foreground">Se o sistema pedir menos movimento, o modo reduzido é aplicado automaticamente.</p>
          </div>
          <div className="space-y-2 border-t border-border pt-5">
            <h2 className="font-bold">Dados de demonstração</h2>
            <Button variant="outline" onClick={() => toast.success("Dados de demonstração restaurados")}><RotateCcw /> Restaurar dados de demonstração</Button>
          </div>
        </GlassCard>
      </div>
    </>
  );
}

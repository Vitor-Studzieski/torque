import { useState } from "react";
import { Moon, Sun, Store } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/torque/PageHeader";
import { GlassCard } from "@/components/torque/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrefs } from "@/stores/preferences.store";
import { isServerBackedWorkshop, useWorkshopStore } from "@/stores/workshop.store";
import { cn } from "@/lib/utils";
function Seg({ value, options, onChange, label }) {
  return (
    <div
      className="inline-flex flex-wrap rounded-xl border border-border bg-muted p-1"
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.v}
          type="button"
          role="radio"
          aria-checked={value === option.v}
          onClick={() => onChange(option.v)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-muted-foreground transition-all",
            value === option.v && "bg-background text-foreground shadow-card",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
export function SettingsPage() {
  const { theme, setTheme, motion, setMotion } = usePrefs();
  const shop = useWorkshopStore((state) => state.shop);
  const updateShop = useWorkshopStore((state) => state.updateShop);
  const [draft, setDraft] = useState(shop);
  function saveShop(event) {
    event.preventDefault();
    if (!draft.name.trim()) {
      toast.error("O nome da oficina é obrigatório.");
      return;
    }
    updateShop({ name: draft.name.trim(), cnpj: draft.cnpj.trim(), phone: draft.phone.trim() });
    toast.success(
      isServerBackedWorkshop
        ? "Dados da oficina salvos"
        : "Dados da oficina salvos neste navegador",
    );
  }
  return (
    <>
      <PageHeader
        title="Configurações"
        description={
          isServerBackedWorkshop
            ? "Dados da oficina sincronizados com o PostgreSQL; preferências locais neste dispositivo."
            : "Preferências e dados da oficina salvos neste navegador."
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Store className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">Dados da oficina</h2>
              <p className="text-xs text-muted-foreground">Identificação da oficina</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={saveShop}>
            <div className="space-y-2">
              <Label htmlFor="shop-name">Nome da oficina *</Label>
              <Input
                id="shop-name"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-cnpj">CNPJ</Label>
              <Input
                id="shop-cnpj"
                value={draft.cnpj}
                onChange={(e) => setDraft({ ...draft, cnpj: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-phone">Telefone</Label>
              <Input
                id="shop-phone"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className="font-mono"
              />
            </div>
            <Button variant="glow" type="submit">
              Salvar dados
            </Button>
          </form>
        </GlassCard>
        <GlassCard className="space-y-6 p-6">
          <div className="space-y-3">
            <div>
              <h2 className="font-bold">Tema</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                O modo escuro é o padrão; sua escolha é persistida localmente.
              </p>
            </div>
            <Seg
              label="Tema da interface"
              value={theme}
              onChange={(value) => {
                setTheme(value);
                toast.success(value === "dark" ? "Tema escuro ativado" : "Tema claro ativado");
              }}
              options={[
                { v: "dark", label: "Escuro", icon: <Moon className="size-4" /> },
                { v: "light", label: "Claro", icon: <Sun className="size-4" /> },
              ]}
            />
          </div>
          <div className="space-y-3">
            <div>
              <h2 className="font-bold">Intensidade das animações</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Animações respeitam também a preferência de movimento do sistema operacional.
              </p>
            </div>
            <Seg
              label="Intensidade das animações"
              value={motion}
              onChange={(value) => {
                setMotion(value);
                toast.success("Preferência de animação salva");
              }}
              options={[
                { v: "full", label: "Completa" },
                { v: "reduced", label: "Reduzida" },
                { v: "off", label: "Desligada" },
              ]}
            />
          </div>
        </GlassCard>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {isServerBackedWorkshop
          ? "Cadastros operacionais são armazenados no banco da oficina. Fotos privadas precisam da configuração do Supabase Storage."
          : "A demonstração guarda os cadastros operacionais somente neste navegador."}
      </p>
    </>
  );
}

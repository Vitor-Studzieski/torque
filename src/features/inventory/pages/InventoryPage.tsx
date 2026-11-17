import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/torque/PageHeader";
import { GlassCard } from "@/components/torque/GlassCard";
import { StatusPill } from "@/components/torque/StatusPill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkshopStore } from "@/stores/workshop.store";
import { formatBRL } from "@/lib/format";
import type { Part } from "@/features/inventory/types";

type PartDraft = Omit<Part, "id">;
const blank: PartDraft = {
  code: "",
  name: "",
  category: "Filtros",
  brand: "",
  quantity: 0,
  minimumQuantity: 3,
  costPrice: 0,
  salePrice: 0,
};
const field =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function InventoryPage() {
  const parts = useWorkshopStore((state) => state.parts);
  const orders = useWorkshopStore((state) => state.workOrders);
  const createPart = useWorkshopStore((state) => state.createPart);
  const adjustStock = useWorkshopStore((state) => state.adjustPartStock);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PartDraft>(blank);
  const categories = [...new Set(parts.map((part) => part.category))].sort();
  const rows = useMemo(
    () =>
      parts.filter((part) => {
        const normalized = query.trim().toLocaleLowerCase("pt-BR");
        return (
          (category === "all" || part.category === category) &&
          (!normalized ||
            [part.code, part.name, part.category, part.brand].some((value) =>
              value.toLocaleLowerCase("pt-BR").includes(normalized),
            ))
        );
      }),
    [category, parts, query],
  );
  const lowStock = parts.filter((part) => part.quantity <= part.minimumQuantity).length;
  const inventoryCost = parts.reduce((sum, part) => sum + part.quantity * part.costPrice, 0);
  const inventorySale = parts.reduce((sum, part) => sum + part.quantity * part.salePrice, 0);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.code.trim() || !draft.name.trim() || draft.salePrice <= 0) {
      toast.error("Código, nome e preço de venda são obrigatórios.");
      return;
    }
    if (
      parts.some((part) => part.code.toLocaleLowerCase() === draft.code.trim().toLocaleLowerCase())
    ) {
      toast.error("Já existe uma peça com esse código.");
      return;
    }
    createPart({
      ...draft,
      code: draft.code.trim().toLocaleUpperCase(),
      name: draft.name.trim(),
      brand: draft.brand.trim(),
    });
    toast.success("Peça cadastrada no estoque");
    setOpen(false);
    setDraft(blank);
  }

  return (
    <>
      <PageHeader
        title="Estoque e peças"
        description="Saldos, custo, preço e itens previstos nas ordens de serviço."
        actions={
          <Button variant="glow" onClick={() => setOpen(true)}>
            <Plus /> Cadastrar peça
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Summary label="Itens cadastrados" value={parts.length.toString().padStart(2, "0")} />
        <Summary
          label="Abaixo do mínimo"
          value={lowStock.toString().padStart(2, "0")}
          warning={lowStock > 0}
        />
        <Summary label="Custo em estoque" value={formatBRL(inventoryCost)} />
        <Summary label="Valor potencial de venda" value={formatBRL(inventorySale)} />
      </div>
      <GlassCard className="mb-4 space-y-3 p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${field} pl-9`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por peça, código, categoria ou marca"
              aria-label="Buscar peças"
            />
          </label>
          <select
            className={field}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filtrar categoria"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5 text-warning" />
          Peças previstas em uma OS não alteram o saldo; a baixa acontece ao marcá-las como
          aplicadas.
        </p>
      </GlassCard>
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="border-b border-border bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Peça</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-right">Venda</th>
                <th className="px-4 py-3 text-center">Saldo</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Movimentar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((part) => {
                const low = part.quantity <= part.minimumQuantity;
                const usageCount = orders.reduce(
                  (count, order) =>
                    count + order.parts.filter((usage) => usage.partId === part.id).length,
                  0,
                );
                return (
                  <tr key={part.id} className="hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{part.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {part.code} · {part.brand}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{part.category}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatBRL(part.costPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatBRL(part.salePrice)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-lg font-bold">{part.quantity}</span>
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        / mín. {part.minimumQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={low ? "warning" : "success"}>
                        {low ? "Repor" : "Disponível"}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={part.quantity === 0}
                          aria-label={`Registrar saída de ${part.name}`}
                          title={`OS relacionadas: ${usageCount}`}
                          onClick={() => {
                            adjustStock(part.id, -1);
                            toast.success("Saída de uma unidade registrada");
                          }}
                        >
                          <ArrowUpFromLine />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={`Registrar entrada de ${part.name}`}
                          onClick={() => {
                            adjustStock(part.id, 1);
                            toast.success("Entrada de uma unidade registrada");
                          }}
                        >
                          <ArrowDownToLine />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma peça encontrada.</p>
        )}
      </GlassCard>
      <p className="mt-3 text-xs text-muted-foreground">
        Movimentações de estoque são locais e demonstrativas. Peças usadas em OS aparecem no
        histórico e no saldo.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar peça</DialogTitle>
            <DialogDescription>Inclua o item no catálogo local de demonstração.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Código *">
                <input
                  className={`${field} font-mono uppercase`}
                  required
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                />
              </Field>
              <Field label="Nome da peça *">
                <input
                  className={field}
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="Categoria">
                <input
                  className={field}
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                />
              </Field>
              <Field label="Marca">
                <input
                  className={field}
                  value={draft.brand}
                  onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                />
              </Field>
              <Field label="Quantidade inicial">
                <input
                  className={field}
                  type="number"
                  min="0"
                  value={draft.quantity}
                  onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Estoque mínimo">
                <input
                  className={field}
                  type="number"
                  min="0"
                  value={draft.minimumQuantity}
                  onChange={(e) => setDraft({ ...draft, minimumQuantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Custo unitário">
                <input
                  className={field}
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.costPrice || ""}
                  onChange={(e) => setDraft({ ...draft, costPrice: Number(e.target.value) })}
                />
              </Field>
              <Field label="Preço de venda *">
                <input
                  className={field}
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={draft.salePrice || ""}
                  onChange={(e) => setDraft({ ...draft, salePrice: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Button type="submit" variant="glow" className="w-full">
              <Package /> Salvar peça
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
function Summary({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <GlassCard className="p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono text-lg font-bold sm:text-xl ${warning ? "text-warning" : ""}`}>
        {value}
      </p>
    </GlassCard>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

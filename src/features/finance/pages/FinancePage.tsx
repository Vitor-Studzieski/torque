import { useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Plus, Search, Wallet } from "lucide-react";
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
import { formatBRL, formatDate } from "@/lib/format";
import type { FinanceEntry, FinanceType } from "@/features/finance/types";

type FinanceDraft = Pick<FinanceEntry, "description" | "type" | "category" | "amount" | "dueDate">;
const blank: FinanceDraft = {
  description: "",
  type: "receivable",
  category: "Serviços e peças",
  amount: 0,
  dueDate: new Date().toISOString().slice(0, 10),
};
const field =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
type StatusFilter = "all" | FinanceEntry["status"];

export function FinancePage() {
  const entries = useWorkshopStore((state) => state.financeEntries);
  const orders = useWorkshopStore((state) => state.workOrders);
  const createEntry = useWorkshopStore((state) => state.createFinanceEntry);
  const setStatus = useWorkshopStore((state) => state.setFinanceEntryStatus);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FinanceDraft>(blank);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | FinanceType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const totals = useMemo(
    () =>
      entries.reduce(
        (result, entry) => {
          result[entry.type] += entry.amount;
          if (entry.status === "overdue") result.overdue += entry.amount;
          if (entry.status !== "paid")
            result.forecast += entry.type === "receivable" ? entry.amount : -entry.amount;
          if (entry.type === "receivable" && entry.status === "paid")
            result.received += entry.amount;
          return result;
        },
        { receivable: 0, payable: 0, overdue: 0, forecast: 0, received: 0 },
      ),
    [entries],
  );
  const rows = entries
    .filter((entry) => {
      const matchesQuery = [entry.description, entry.category].some((value) =>
        value.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")),
      );
      return (
        matchesQuery &&
        (typeFilter === "all" || entry.type === typeFilter) &&
        (statusFilter === "all" || entry.status === statusFilter)
      );
    })
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.description.trim() || draft.amount <= 0) {
      toast.error("Informe descrição e um valor maior que zero.");
      return;
    }
    createEntry({
      ...draft,
      description: draft.description.trim(),
      dueDate: new Date(`${draft.dueDate}T12:00:00`).toISOString(),
    });
    toast.success("Lançamento registrado");
    setOpen(false);
    setDraft({ ...blank, dueDate: new Date().toISOString().slice(0, 10) });
  }

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Contas a receber, compromissos e previsão de caixa."
        actions={
          <Button variant="glow" onClick={() => setOpen(true)}>
            <Plus /> Novo lançamento
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Summary
          icon={ArrowDownLeft}
          label="A receber"
          value={formatBRL(totals.receivable)}
          tone="text-success"
        />
        <Summary
          icon={ArrowUpRight}
          label="A pagar"
          value={formatBRL(totals.payable)}
          tone="text-warning"
        />
        <Summary
          icon={CircleDollarSign}
          label="Saldo previsto"
          value={formatBRL(totals.forecast)}
          tone="text-primary"
        />
        <Summary
          icon={Wallet}
          label="Valores vencidos"
          value={formatBRL(totals.overdue)}
          tone="text-danger"
        />
      </div>
      <GlassCard className="mb-4 space-y-3 p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_180px_180px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${field} pl-9`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar lançamento ou categoria"
              aria-label="Buscar lançamentos"
            />
          </label>
          <select
            className={field}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | FinanceType)}
            aria-label="Filtrar por tipo"
          >
            <option value="all">Entradas e saídas</option>
            <option value="receivable">A receber</option>
            <option value="payable">A pagar</option>
          </select>
          <select
            className={field}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            aria-label="Filtrar por situação"
          >
            <option value="all">Todas as situações</option>
            <option value="pending">Em aberto</option>
            <option value="overdue">Vencidos</option>
            <option value="paid">Pagos</option>
          </select>
        </div>
        <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" />
          Valores e baixa de pagamentos são demonstrativos; não há integração bancária.
        </p>
      </GlassCard>
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-border bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Lançamento</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((entry) => {
                const order = orders.find((item) => item.id === entry.workOrderId);
                return (
                  <tr key={entry.id} className="hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.category}
                        {order ? (
                          <>
                            {" "}
                            ·{" "}
                            <Link
                              to="/app/ordens/$id"
                              params={{ id: order.id }}
                              className="text-primary hover:underline"
                            >
                              {order.code}
                            </Link>
                          </>
                        ) : (
                          ""
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={entry.type === "receivable" ? "success" : "warning"}>
                        {entry.type === "receivable" ? "Entrada" : "Saída"}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(entry.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {formatBRL(entry.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        tone={
                          entry.status === "paid"
                            ? "success"
                            : entry.status === "overdue"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {entry.status === "paid"
                          ? "Pago"
                          : entry.status === "overdue"
                            ? "Vencido"
                            : "Em aberto"}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={entry.status === "paid" ? "ghost" : "outline"}
                        onClick={() => {
                          setStatus(entry.id, entry.status === "paid" ? "pending" : "paid");
                          toast.success(
                            entry.status === "paid"
                              ? "Lançamento reaberto"
                              : "Pagamento registrado na demonstração",
                          );
                        }}
                      >
                        {entry.status === "paid" ? "Reabrir" : "Dar baixa"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Nenhum lançamento corresponde aos filtros.
          </p>
        )}
      </GlassCard>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
            <DialogDescription>
              Registre uma entrada ou saída fictícia para a demonstração.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <Field label="Descrição *">
              <input
                className={field}
                required
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Ex.: Revisão preventiva"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <select
                  className={field}
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as FinanceType })}
                >
                  <option value="receivable">A receber</option>
                  <option value="payable">A pagar</option>
                </select>
              </Field>
              <Field label="Categoria">
                <select
                  className={field}
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  {[
                    "Serviços e peças",
                    "Mão de obra",
                    "Peças",
                    "Fornecedor",
                    "Despesas fixas",
                    "Serviços externos",
                  ].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="Valor (R$) *">
                <input
                  className={field}
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={draft.amount || ""}
                  onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
                />
              </Field>
              <Field label="Vencimento">
                <input
                  className={field}
                  type="date"
                  required
                  value={draft.dueDate}
                  onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                />
              </Field>
            </div>
            <Button type="submit" variant="glow" className="w-full">
              Salvar lançamento
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
function Summary({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <p className={`mt-2 font-mono text-lg font-bold sm:text-xl ${tone}`}>{value}</p>
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

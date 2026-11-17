import { useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Car, Edit2, Mail, Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/torque/PageHeader";
import { GlassCard } from "@/components/torque/GlassCard";
import { Plate } from "@/components/torque/Plate";
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
import type { Customer } from "@/features/customers/types";

type CustomerDraft = Pick<Customer, "name" | "phone" | "email" | "notes">;
const blank: CustomerDraft = { name: "", phone: "", email: "", notes: "" };
const field =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CustomersPage() {
  const customers = useWorkshopStore((state) => state.customers);
  const vehicles = useWorkshopStore((state) => state.vehicles);
  const orders = useWorkshopStore((state) => state.workOrders);
  const createCustomer = useWorkshopStore((state) => state.createCustomer);
  const updateCustomer = useWorkshopStore((state) => state.updateCustomer);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CustomerDraft>(blank);

  const allRows = useMemo(() => {
    return customers.map((customer) => {
      const customerVehicles = vehicles.filter((vehicle) => vehicle.customerId === customer.id);
      const customerOrders = orders.filter((order) => order.customerId === customer.id);
      const latest = customerOrders.reduce<string | null>(
        (value, order) => (!value || order.openedAt > value ? order.openedAt : value),
        null,
      );
      const lastActiveDays = latest
        ? (Date.now() - new Date(latest).getTime()) / 86_400_000
        : Infinity;
      const label =
        Date.now() - new Date(customer.createdAt).getTime() < 30 * 86_400_000
          ? "Novo"
          : lastActiveDays > 90
            ? "Inativo"
            : customerOrders.length > 1
              ? "Recorrente"
              : "Ativo";
      return { customer, customerVehicles, customerOrders, label, latest };
    });
  }, [customers, orders, vehicles]);
  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return allRows.filter(
      ({ customer, customerVehicles }) =>
        !query ||
        [
          customer.name,
          customer.phone,
          customer.email,
          ...customerVehicles.flatMap((vehicle) => [vehicle.plate, vehicle.model, vehicle.make]),
        ].some((value) => value.toLocaleLowerCase("pt-BR").includes(query)),
    );
  }, [allRows, search]);

  function openCreate() {
    setEditing(null);
    setDraft(blank);
    setOpen(true);
  }
  function openEdit(customer: Customer) {
    setEditing(customer);
    setDraft({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
    });
    setOpen(true);
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.phone.trim()) {
      toast.error("Nome e telefone são obrigatórios.");
      return;
    }
    if (editing) updateCustomer(editing.id, draft);
    else
      createCustomer({
        ...draft,
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        email: draft.email.trim(),
        notes: draft.notes.trim(),
      });
    toast.success(editing ? "Cadastro atualizado" : "Cliente cadastrado");
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Relacionamento, veículos e histórico em um só lugar."
        actions={
          <Button variant="glow" onClick={openCreate}>
            <Plus /> Adicionar cliente
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Clientes cadastrados" value={customers.length} />
        <Metric
          label="Relacionamentos recorrentes"
          value={allRows.filter((row) => row.label === "Recorrente").length}
        />
        <Metric
          label="Novos clientes"
          value={allRows.filter((row) => row.label === "Novo").length}
        />
        <Metric
          label="Sem visita recente"
          value={allRows.filter((row) => row.label === "Inativo").length}
        />
      </div>
      <GlassCard className="mb-4 p-3">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${field} pl-9`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, telefone, placa ou modelo"
            aria-label="Buscar clientes"
          />
        </label>
      </GlassCard>
      <div className="space-y-3">
        {rows.map(({ customer, customerVehicles, customerOrders, label, latest }) => {
          const spent = customerOrders.reduce(
            (sum, order) =>
              sum +
              order.services.reduce((subtotal, service) => subtotal + service.laborPrice, 0) +
              order.parts.reduce((subtotal, part) => subtotal + part.quantity * part.unitPrice, 0),
            0,
          );
          return (
            <GlassCard key={customer.id} className="overflow-hidden p-0">
              <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="size-5" />
                </div>
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setExpanded(expanded === customer.id ? null : customer.id)}
                  aria-expanded={expanded === customer.id}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <strong>{customer.name}</strong>
                    <StatusPill
                      tone={
                        label === "Novo"
                          ? "info"
                          : label === "Recorrente"
                            ? "success"
                            : label === "Inativo"
                              ? "neutral"
                              : "primary"
                      }
                    >
                      {label}
                    </StatusPill>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{customer.phone}</span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" />
                      {customer.email}
                    </span>
                  </span>
                </button>
                <div className="hidden text-right sm:block">
                  <p className="font-mono text-sm font-bold">{formatBRL(spent)}</p>
                  <p className="text-xs text-muted-foreground">valor histórico demonstrativo</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEdit(customer)}>
                  <Edit2 /> Editar
                </Button>
              </div>
              {expanded === customer.id && (
                <div className="grid gap-4 border-t border-border bg-muted/25 p-4 sm:p-5 md:grid-cols-[1fr_1fr_220px]">
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Veículos ({customerVehicles.length})
                    </h3>
                    {customerVehicles.length ? (
                      <div className="space-y-2">
                        {customerVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className="flex items-center gap-3 rounded-xl border border-border bg-card/70 p-3"
                          >
                            <Plate value={vehicle.plate} size="sm" />
                            <span className="text-sm font-semibold">
                              {vehicle.make} {vehicle.model}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                {vehicle.year}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum veículo vinculado.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Ordens recentes ({customerOrders.length})
                    </h3>
                    {customerOrders
                      .slice()
                      .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
                      .slice(0, 3)
                      .map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                        >
                          <Link
                            to="/app/ordens/$id"
                            params={{ id: order.id }}
                            className="font-mono text-xs font-bold text-primary hover:underline"
                          >
                            {order.code}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(order.openedAt)}
                          </span>
                          <StatusPill tone={order.status === "delivered" ? "success" : "info"}>
                            {order.status === "delivered" ? "Entregue" : "Em andamento"}
                          </StatusPill>
                        </div>
                      ))}
                  </div>
                  <div className="rounded-xl bg-card/70 p-3">
                    <p className="text-xs text-muted-foreground">Último atendimento</p>
                    <p className="mt-1 font-semibold">
                      {latest ? formatDate(latest) : "Sem histórico"}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">Observações</p>
                    <p className="mt-1 text-sm">
                      {customer.notes || "Nenhuma observação registrada."}
                    </p>
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
        {rows.length === 0 && (
          <GlassCard className="p-10 text-center">
            <Users className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">Nenhum cliente encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste a busca ou cadastre um novo cliente.
            </p>
          </GlassCard>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              Dados de demonstração ficam salvos neste navegador.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <Field label="Nome completo *">
              <input
                className={field}
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Telefone *">
                <input
                  className={field}
                  required
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </Field>
              <Field label="E-mail">
                <input
                  className={field}
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Observações">
              <textarea
                className="min-h-20 w-full rounded-xl border border-input bg-background p-3 text-sm"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>
            <Button type="submit" variant="glow" className="w-full">
              {editing ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <GlassCard className="p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value.toString().padStart(2, "0")}</p>
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

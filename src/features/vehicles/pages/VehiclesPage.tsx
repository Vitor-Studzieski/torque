import { useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Car, Edit2, Gauge, Plus, Search } from "lucide-react";
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
import type { Vehicle } from "@/features/vehicles/types";

type VehicleDraft = Omit<Vehicle, "id">;
const blank: VehicleDraft = {
  customerId: "",
  plate: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  color: "",
  mileage: 0,
  fuelPercent: 50,
};
const field =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function VehiclesPage() {
  const vehicles = useWorkshopStore((state) => state.vehicles);
  const customers = useWorkshopStore((state) => state.customers);
  const orders = useWorkshopStore((state) => state.workOrders);
  const createVehicle = useWorkshopStore((state) => state.createVehicle);
  const updateVehicle = useWorkshopStore((state) => state.updateVehicle);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VehicleDraft>(blank);
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return vehicles
      .map((vehicle) => ({
        vehicle,
        customer: customers.find((item) => item.id === vehicle.customerId),
        history: orders
          .filter((order) => order.vehicleId === vehicle.id)
          .sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
      }))
      .filter(
        ({ vehicle, customer }) =>
          !normalized ||
          [vehicle.plate, vehicle.make, vehicle.model, vehicle.color, customer?.name].some(
            (value) => value?.toLocaleLowerCase("pt-BR").includes(normalized),
          ),
      );
  }, [customers, orders, query, vehicles]);

  function create() {
    setEditing(null);
    setDraft({ ...blank, customerId: customers[0]?.id ?? "" });
    setOpen(true);
  }
  function edit(vehicle: Vehicle) {
    setEditing(vehicle);
    setDraft({ ...vehicle });
    setOpen(true);
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.customerId || !draft.plate.trim() || !draft.make.trim() || !draft.model.trim()) {
      toast.error("Cliente, placa, marca e modelo são obrigatórios.");
      return;
    }
    const normalized = {
      ...draft,
      plate: draft.plate.toLocaleUpperCase("pt-BR").replace(/[^A-Z0-9]/g, ""),
    };
    if (editing) updateVehicle(editing.id, normalized);
    else createVehicle(normalized);
    toast.success(editing ? "Veículo atualizado" : "Veículo cadastrado");
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Veículos"
        description="Cadastro, leitura da placa e histórico de manutenção."
        actions={
          <Button variant="glow" onClick={create}>
            <Plus /> Adicionar veículo
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Veículos cadastrados" value={vehicles.length} />
        <Metric
          label="Na oficina agora"
          value={
            orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length
          }
        />
        <Metric
          label="Em manutenção"
          value={
            new Set(
              orders
                .filter((order) => !["delivered", "cancelled"].includes(order.status))
                .map((order) => order.vehicleId),
            ).size
          }
        />
        <Metric label="OS relacionadas" value={orders.length} />
      </div>
      <GlassCard className="mb-4 p-3">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${field} pl-9`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar placa, marca, modelo ou cliente"
            aria-label="Buscar veículos"
          />
        </label>
      </GlassCard>
      <div className="grid gap-3 xl:grid-cols-2">
        {rows.map(({ vehicle, customer, history }) => (
          <GlassCard key={vehicle.id} className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Car className="size-6" />
              </div>
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => setExpanded(expanded === vehicle.id ? null : vehicle.id)}
                aria-expanded={expanded === vehicle.id}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Plate value={vehicle.plate} size="sm" />
                  <span className="font-bold">
                    {vehicle.make} {vehicle.model}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {vehicle.year} · {vehicle.color} · {customer?.name ?? "Cliente não encontrado"}
                </p>
              </button>
              <div className="hidden text-right sm:block">
                <p className="inline-flex items-center gap-1 font-mono text-sm font-semibold">
                  <Gauge className="size-4 text-primary" />
                  {vehicle.mileage.toLocaleString("pt-BR")} km
                </p>
                <p className="text-xs text-muted-foreground">odômetro informado</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => edit(vehicle)}>
                <Edit2 /> Editar
              </Button>
            </div>
            {expanded === vehicle.id && (
              <div className="border-t border-border bg-muted/25 p-4 sm:p-5">
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <Metric label="Combustível registrado" value={`${vehicle.fuelPercent}%`} />
                  <Metric label="Atendimentos" value={history.length} />
                  <Metric
                    label="Total de serviços"
                    value={formatBRL(
                      history.reduce(
                        (sum, order) =>
                          sum +
                          order.services.reduce((subtotal, item) => subtotal + item.laborPrice, 0) +
                          order.parts.reduce(
                            (subtotal, item) => subtotal + item.quantity * item.unitPrice,
                            0,
                          ),
                        0,
                      ),
                    )}
                  />
                </div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Histórico de manutenção
                </h3>
                {history.length ? (
                  <ol className="space-y-2">
                    {history.map((order) => (
                      <li
                        key={order.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/70 p-3"
                      >
                        <div>
                          <p className="font-mono text-xs font-bold">{order.code}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(order.openedAt)} · {order.complaint}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill
                            tone={
                              order.status === "delivered"
                                ? "success"
                                : order.status === "cancelled"
                                  ? "danger"
                                  : "info"
                            }
                          >
                            {order.status === "delivered"
                              ? "Entregue"
                              : order.status === "cancelled"
                                ? "Cancelada"
                                : "Em andamento"}
                          </StatusPill>
                          <Button asChild variant="ghost" size="icon">
                            <Link
                              to="/app/ordens/$id"
                              params={{ id: order.id }}
                              aria-label={`Abrir ${order.code}`}
                            >
                              <ArrowRight />
                            </Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Este veículo ainda não tem ordens de serviço.
                  </p>
                )}
              </div>
            )}
          </GlassCard>
        ))}
        {rows.length === 0 && (
          <GlassCard className="p-10 text-center xl:col-span-2">
            <Car className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">Nenhum veículo encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste a busca ou cadastre um veículo.
            </p>
          </GlassCard>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar veículo" : "Novo veículo"}</DialogTitle>
            <DialogDescription>
              O cadastro fica associado ao histórico do cliente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <Field label="Cliente *">
              <select
                className={field}
                required
                value={draft.customerId}
                onChange={(e) => setDraft({ ...draft, customerId: e.target.value })}
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Placa Mercosul *">
                <input
                  className={`${field} font-mono uppercase`}
                  required
                  value={draft.plate}
                  onChange={(e) => setDraft({ ...draft, plate: e.target.value })}
                  placeholder="BRA2E19"
                />
              </Field>
              <Field label="Marca *">
                <input
                  className={field}
                  required
                  value={draft.make}
                  onChange={(e) => setDraft({ ...draft, make: e.target.value })}
                />
              </Field>
              <Field label="Modelo *">
                <input
                  className={field}
                  required
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                />
              </Field>
              <Field label="Ano">
                <input
                  className={field}
                  type="number"
                  min="1950"
                  max="2100"
                  value={draft.year}
                  onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })}
                />
              </Field>
              <Field label="Cor">
                <input
                  className={field}
                  value={draft.color}
                  onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                />
              </Field>
              <Field label="Quilometragem">
                <input
                  className={field}
                  type="number"
                  min="0"
                  value={draft.mileage}
                  onChange={(e) => setDraft({ ...draft, mileage: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Button type="submit" variant="glow" className="w-full">
              {editing ? "Salvar veículo" : "Cadastrar veículo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <GlassCard className="p-3">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold">
        {typeof value === "number" ? value.toString().padStart(2, "0") : value}
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

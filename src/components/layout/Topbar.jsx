import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Search, Plus, UserPlus, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROFILES, usePrefs } from "@/stores/preferences.store";
import { Logo } from "@/components/torque/Logo";
import { CommandMenu } from "./CommandMenu";
import { hasPermission } from "@/lib/permissions";
import { CreateWorkOrderDialog } from "@/features/work-orders/components/CreateWorkOrderDialog";
import { useWorkshopStore } from "@/stores/workshop.store";
import { UserButton } from "@clerk/tanstack-react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
const customerField =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
export function Topbar({ profile: profileProp, profileLocked = false }) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerDraft, setCustomerDraft] = useState({ name: "", phone: "", email: "" });
  const navigate = useNavigate();
  const { theme, setTheme, profile: storedProfile, setProfile } = usePrefs();
  const profile = profileProp ?? storedProfile;
  const canCreateOrder = hasPermission(profile, "createWorkOrder");
  const canManageCustomers = hasPermission(profile, "manageCustomers");
  const canRegisterExit = profile === "gestor";
  const customers = useWorkshopStore((state) => state.customers);
  const vehicles = useWorkshopStore((state) => state.vehicles);
  const orders = useWorkshopStore((state) => state.workOrders);
  const createWorkOrder = useWorkshopStore((state) => state.createWorkOrder);
  const createCustomer = useWorkshopStore((state) => state.createCustomer);
  function handleCreate(input) {
    if (!canCreateOrder) return;
    const order = createWorkOrder(input);
    setCreateOpen(false);
    toast.success(`${order.code} criada`, {
      description: "Entrada registrada no fluxo da oficina.",
    });
    void navigate({ to: "/app/ordens/$id", params: { id: order.id } });
  }
  function openReadyOrder() {
    if (!canRegisterExit) return;
    const ready = orders.find((order) => order.status === "ready");
    if (!ready) {
      toast.info("Nenhuma OS pronta para retirada no momento.");
      return;
    }
    void navigate({ to: "/app/ordens/$id", params: { id: ready.id } });
  }
  function saveCustomer(event) {
    event.preventDefault();
    if (!canManageCustomers) return;
    const customer = createCustomer({
      ...customerDraft,
      name: customerDraft.name.trim(),
      phone: customerDraft.phone.trim(),
      email: customerDraft.email.trim(),
      notes: "",
    });
    setCustomerDraft({ name: "", phone: "", email: "" });
    setCustomerOpen(false);
    toast.success("Cliente cadastrado", { description: customer.name });
    void navigate({ to: "/app/clientes" });
  }
  return (
    <header className="sticky top-7 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="lg:hidden" aria-label="Torque — início">
          <Logo collapsed />
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="glass flex h-10 flex-1 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:max-w-sm"
        >
          <Search className="size-4" aria-hidden />
          <span className="truncate">Buscar OS, placa, cliente…</span>
          <kbd className="ml-auto hidden rounded-md border border-border px-1.5 font-mono text-[10px] sm:inline">
            Ctrl K
          </kbd>
        </button>
        <div className="ml-auto hidden items-center gap-1.5 xl:flex">
          {canCreateOrder && (
            <Button variant="glow" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus /> Nova OS
            </Button>
          )}
          {canManageCustomers && (
            <Button variant="ghost" size="sm" onClick={() => setCustomerOpen(true)}>
              <UserPlus /> Adicionar cliente
            </Button>
          )}
          {canCreateOrder && (
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(true)}>
              <LogIn /> Registrar entrada
            </Button>
          )}
          {canRegisterExit && (
            <Button variant="ghost" size="sm" onClick={openReadyOrder}>
              <LogOut /> Registrar saída
            </Button>
          )}
        </div>
        {profileLocked ? (
          <div
            className="hidden h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground md:flex"
            aria-label={`Perfil: ${PROFILES[profile]?.label ?? profile}`}
          >
            {PROFILES[profile]?.label ?? profile}
          </div>
        ) : (
          <Select value={profile} onValueChange={(v) => setProfile(v)}>
            <SelectTrigger className="hidden h-10 w-[140px] rounded-xl md:flex" aria-label="Perfil">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROFILES).map(([k, p]) => (
                <SelectItem key={k} value={k}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {profileLocked && <UserButton />}
        <Button
          variant="glass"
          size="icon"
          className="size-10"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </div>
      <CommandMenu
        open={open}
        setOpen={setOpen}
        onNewOrder={() => setCreateOpen(true)}
        onAddCustomer={() => setCustomerOpen(true)}
        onRegisterExit={openReadyOrder}
        profile={profile}
        canCreateOrder={canCreateOrder}
        canManageCustomers={canManageCustomers}
        canRegisterExit={canRegisterExit}
      />
      <CreateWorkOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        customers={customers}
        vehicles={vehicles}
        onCreate={handleCreate}
      />
      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>
              O cadastro fica salvo localmente nesta demonstração.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveCustomer}>
            <label className="block space-y-1.5 text-xs font-semibold text-muted-foreground">
              Nome completo *
              <input
                className={customerField}
                required
                autoFocus
                value={customerDraft.name}
                onChange={(event) =>
                  setCustomerDraft({ ...customerDraft, name: event.target.value })
                }
              />
            </label>
            <label className="block space-y-1.5 text-xs font-semibold text-muted-foreground">
              Telefone *
              <input
                className={customerField}
                required
                value={customerDraft.phone}
                onChange={(event) =>
                  setCustomerDraft({ ...customerDraft, phone: event.target.value })
                }
              />
            </label>
            <label className="block space-y-1.5 text-xs font-semibold text-muted-foreground">
              E-mail
              <input
                className={customerField}
                type="email"
                value={customerDraft.email}
                onChange={(event) =>
                  setCustomerDraft({ ...customerDraft, email: event.target.value })
                }
              />
            </label>
            <Button variant="glow" type="submit" className="w-full">
              Cadastrar cliente
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}

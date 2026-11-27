import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, UserPlus, LogIn, LogOut, ClipboardList } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV } from "./navigation";
import { useWorkshopStore } from "@/stores/workshop.store";
import { canAccessPath } from "@/lib/permissions";
export function CommandMenu({
  open,
  setOpen,
  onNewOrder,
  onAddCustomer,
  onRegisterExit,
  profile,
  canCreateOrder,
  canManageCustomers,
  canRegisterExit,
}) {
  const navigate = useNavigate();
  const orders = useWorkshopStore((state) => state.workOrders);
  const vehicles = useWorkshopStore((state) => state.vehicles);
  const customers = useWorkshopStore((state) => state.customers);
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, setOpen]);
  const go = (to) => {
    setOpen(false);
    navigate({ to });
  };
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar módulo, OS, placa ou cliente…" />
      <CommandList>
        <CommandEmpty>Nada encontrado. Tente outra placa ou nome.</CommandEmpty>
        {(canCreateOrder || canManageCustomers || canRegisterExit) && (
          <CommandGroup heading="Ações rápidas">
            {canCreateOrder && (
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onNewOrder();
                }}
              >
                <Plus /> Nova OS
              </CommandItem>
            )}
            {canManageCustomers && (
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onAddCustomer();
                }}
              >
                <UserPlus /> Adicionar cliente
              </CommandItem>
            )}
            {canCreateOrder && (
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onNewOrder();
                }}
              >
                <LogIn /> Registrar entrada
              </CommandItem>
            )}
            {canRegisterExit && (
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onRegisterExit();
                }}
              >
                <LogOut /> Registrar saída
              </CommandItem>
            )}
          </CommandGroup>
        )}
        <CommandGroup heading="Ordens, placas e clientes">
          {orders.map((order) => {
            const vehicle = vehicles.find((item) => item.id === order.vehicleId);
            const customer = customers.find((item) => item.id === order.customerId);
            return (
              <CommandItem
                key={order.id}
                value={`${order.code} ${vehicle?.plate ?? ""} ${vehicle?.make ?? ""} ${vehicle?.model ?? ""} ${customer?.name ?? ""}`}
                onSelect={() => {
                  setOpen(false);
                  void navigate({ to: "/app/ordens/$id", params: { id: order.id } });
                }}
              >
                <ClipboardList />
                <span>
                  {order.code} · {vehicle?.plate ?? "Sem placa"} · {customer?.name ?? "Cliente"}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Módulos">
          {NAV.filter((item) => canAccessPath(profile, item.to)).map((n) => (
            <CommandItem key={n.to} onSelect={() => go(n.to)}>
              <n.icon /> {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

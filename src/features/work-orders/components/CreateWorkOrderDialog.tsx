import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MECHANICS } from "@/data/demo-data";
import type { NewWorkOrderInput } from "@/features/work-orders/types";
import type { Customer } from "@/features/customers/types";
import type { Vehicle } from "@/features/vehicles/types";

const fieldClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
  customers,
  vehicles,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  vehicles: Vehicle[];
  onCreate: (input: NewWorkOrderInput) => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [vehicleId, setVehicleId] = useState(
    vehicles.find((vehicle) => vehicle.customerId === customers[0]?.id)?.id ??
      vehicles[0]?.id ??
      "",
  );
  const [complaint, setComplaint] = useState("");
  const [mileageIn, setMileageIn] = useState(
    vehicles.find((vehicle) => vehicle.id === vehicleId)?.mileage ?? 0,
  );
  const [fuelPercent, setFuelPercent] = useState(50);
  const [mechanic, setMechanic] = useState(MECHANICS[0] ?? "");
  const customerVehicles = vehicles.filter((vehicle) => vehicle.customerId === customerId);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerId || !vehicleId || !complaint.trim()) return;
    onCreate({
      customerId,
      vehicleId,
      complaint: complaint.trim(),
      mileageIn,
      fuelPercent,
      mechanic,
    });
    setComplaint("");
    setMileageIn(vehicles.find((vehicle) => vehicle.id === vehicleId)?.mileage ?? 0);
    setFuelPercent(50);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova ordem de serviço</DialogTitle>
          <DialogDescription>Registre a chegada e comece o histórico do veículo.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-semibold">
            Cliente
            <select
              className={fieldClass}
              required
              value={customerId}
              onChange={(event) => {
                const nextCustomerId = event.target.value;
                const firstVehicle = vehicles.find(
                  (vehicle) => vehicle.customerId === nextCustomerId,
                );
                setCustomerId(nextCustomerId);
                setVehicleId(firstVehicle?.id ?? "");
                setMileageIn(firstVehicle?.mileage ?? 0);
              }}
            >
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Veículo
            <select
              className={fieldClass}
              required
              value={vehicleId}
              onChange={(event) => {
                setVehicleId(event.target.value);
                setMileageIn(
                  vehicles.find((vehicle) => vehicle.id === event.target.value)?.mileage ?? 0,
                );
              }}
            >
              {customerVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} · {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Quilometragem de entrada
            <input
              className={fieldClass}
              type="number"
              min="0"
              step="1"
              required
              value={mileageIn}
              onChange={(event) => setMileageIn(Number(event.target.value))}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Responsável técnico
            <select
              className={fieldClass}
              value={mechanic}
              onChange={(event) => setMechanic(event.target.value)}
            >
              {MECHANICS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            Relato do cliente
            <textarea
              className="min-h-24 w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
              value={complaint}
              onChange={(event) => setComplaint(event.target.value)}
              placeholder="Descreva o que o cliente percebeu no veículo..."
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            Combustível na entrada · {fuelPercent}%
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={fuelPercent}
              onChange={(event) => setFuelPercent(Number(event.target.value))}
              className="accent-primary"
            />
          </label>
          <div className="flex items-center justify-between border-t border-border pt-4 sm:col-span-2">
            <p className="text-xs text-muted-foreground">
              Cadastro e fotos ficam neste navegador nesta demonstração.
            </p>
            <Button variant="glow" type="submit" disabled={!customerId || !vehicleId}>
              Criar OS
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

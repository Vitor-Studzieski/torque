import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ClipboardCheck,
  ImagePlus,
  Plus,
  Send,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";
import { GlassCard } from "@/components/torque/GlassCard";
import { PageHeader } from "@/components/torque/PageHeader";
import { Plate } from "@/components/torque/Plate";
import { StatusPill } from "@/components/torque/StatusPill";
import { Button } from "@/components/ui/button";
import {
  WorkOrderEvidencePhoto,
  WorkOrderEvidenceView,
} from "@/features/work-orders/components/WorkOrderEvidencePhoto";
import {
  prepareWorkOrderPhoto,
  saveWorkOrderPhoto,
  deleteWorkOrderPhoto as deleteLocalWorkOrderPhoto,
} from "@/features/work-orders/lib/photo-storage";
import {
  cancelWorkOrderPhotoUpload,
  confirmWorkOrderPhotoUpload,
  createWorkOrderPhotoUpload,
  deleteWorkOrderPhoto,
} from "@/features/work-orders/api/photos";
import { isServerBackedWorkshop, useWorkshopStore } from "@/stores/workshop.store";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import {
  getApprovedWorkOrderTotal,
  getWorkOrderTransitionError,
  getWorkOrderTotal,
  WORK_ORDER_STATUS_META,
} from "@/lib/work-order";
import { usePrefs } from "@/stores/preferences.store";
import { canMoveWorkOrder, hasPermission } from "@/lib/permissions";
const inputClass =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const statusFlow = {
  intake: "diagnosis",
  diagnosis: "awaiting-approval",
  "waiting-parts": "in-progress",
  "in-progress": "ready",
  ready: "delivered",
};
const evidenceLabels = {
  entry: "Entrada",
  damage: "Avaria",
  part: "Peça",
  work: "Execução",
  delivery: "Saída",
};
const evidenceTitles = {
  entry: "Entrada do veículo",
  damage: "Avaria identificada",
  part: "Peça substituída",
  work: "Execução do serviço",
  delivery: "Saída do veículo",
};
const damageZones = [
  { id: "front", label: "Dianteira", position: "left-1/2 top-0 -translate-x-1/2" },
  { id: "rear", label: "Traseira", position: "bottom-0 left-1/2 -translate-x-1/2" },
  { id: "left", label: "Lateral esquerda", position: "left-0 top-1/2 -translate-y-1/2" },
  { id: "right", label: "Lateral direita", position: "right-0 top-1/2 -translate-y-1/2" },
  {
    id: "roof",
    label: "Teto e vidros",
    position: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  },
];
export function WorkOrderDetailPage({ id }) {
  const navigate = useNavigate();
  const profile = usePrefs((state) => state.profile);
  const canViewPrices = hasPermission(profile, "viewWorkOrderPrices");
  const canEditQuote = hasPermission(profile, "manageWorkOrderQuote");
  const canApproveQuote = hasPermission(profile, "approveWorkOrderQuote");
  const canExecute = hasPermission(profile, "executeWorkOrders");
  const canEditDiagnosis = hasPermission(profile, "editWorkOrderDiagnosis");
  const canEditIntake = hasPermission(profile, "manageWorkOrderIntake");
  const canEditEvidence = hasPermission(profile, "manageWorkOrderEvidence");
  const canDeleteEvidence = canEditEvidence && (!isServerBackedWorkshop || profile === "gestor");
  const canEditChecklists = hasPermission(profile, "manageWorkOrderChecklists");
  const canEditAssignment = hasPermission(profile, "manageWorkOrderAssignments");
  const canManagePayments = hasPermission(profile, "manageWorkOrderPayments");
  const order = useWorkshopStore((state) => state.workOrders.find((item) => item.id === id));
  const customer = useWorkshopStore((state) =>
    state.customers.find((item) => item.id === order?.customerId),
  );
  const vehicle = useWorkshopStore((state) =>
    state.vehicles.find((item) => item.id === order?.vehicleId),
  );
  const inventory = useWorkshopStore((state) => state.parts);
  const mechanics = useWorkshopStore((state) => state.mechanics);
  const updateWorkOrder = useWorkshopStore((state) => state.updateWorkOrder);
  const setStatus = useWorkshopStore((state) => state.setWorkOrderStatus);
  const deleteWorkOrder = useWorkshopStore((state) => state.deleteWorkOrder);
  const setApproval = useWorkshopStore((state) => state.setWorkOrderApproval);
  const sendQuoteAction = useWorkshopStore((state) => state.sendWorkOrderQuote);
  const setServiceStatus = useWorkshopStore((state) => state.setWorkOrderServiceStatus);
  const setServiceApproval = useWorkshopStore((state) => state.setWorkOrderServiceApproval);
  const setPartApproval = useWorkshopStore((state) => state.setWorkOrderPartApproval);
  const addService = useWorkshopStore((state) => state.addWorkOrderService);
  const addPart = useWorkshopStore((state) => state.addWorkOrderPart);
  const setPartInstalled = useWorkshopStore((state) => state.setWorkOrderPartInstalled);
  const toggleChecklist = useWorkshopStore((state) => state.toggleChecklistItem);
  const toggleDamageArea = useWorkshopStore((state) => state.toggleDamageArea);
  const addEvidence = useWorkshopStore((state) => state.addWorkOrderEvidence);
  const removeEvidence = useWorkshopStore((state) => state.removeWorkOrderEvidence);
  const createFinanceEntry = useWorkshopStore((state) => state.createFinanceEntry);
  const financeEntries = useWorkshopStore((state) => state.financeEntries);
  const setFinanceEntryStatus = useWorkshopStore((state) => state.setFinanceEntryStatus);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);
  const [slider, setSlider] = useState(50);
  const [evidenceCategory, setEvidenceCategory] = useState("work");
  const [evidenceFilter, setEvidenceFilter] = useState("all");
  const [photoCaption, setPhotoCaption] = useState("");
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const total = useMemo(() => (order ? getWorkOrderTotal(order) : 0), [order]);
  const approvedTotal = useMemo(() => (order ? getApprovedWorkOrderTotal(order) : 0), [order]);
  if (!order || !customer || !vehicle) {
    return (
      <GlassCard className="p-8 text-center">
        <h1 className="text-xl font-bold">Ordem de serviço não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ela pode ter sido removida ao restaurar os dados de demonstração.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app/ordens">
            <ArrowLeft /> Voltar para ordens
          </Link>
        </Button>
      </GlassCard>
    );
  }
  const statusMeta = WORK_ORDER_STATUS_META[order.status];
  const quoteItemCount = order.services.length + order.parts.length;
  const hasQuoteItems = quoteItemCount > 0;
  const hasPendingApprovalItems = [...order.services, ...order.parts].some(
    (item) => item.approval === "pending",
  );
  const quoteIsEditable = canEditQuote && !["delivered", "cancelled"].includes(order.status);
  const canRecordApproval = canApproveQuote && order.status === "awaiting-approval";
  const nextStatus = statusFlow[order.status];
  const nextStatusError = nextStatus
    ? getWorkOrderTransitionError(order, nextStatus, inventory)
    : null;
  const canChangeToNextStatus = nextStatus
    ? canMoveWorkOrder(profile, order.status, nextStatus, order, inventory)
    : false;
  const allEvidence = order.evidence;
  const entryPhoto = allEvidence.find((item) => item.category === "entry");
  const exitPhoto = allEvidence.find((item) => item.category === "delivery");
  const laborTotal = order.services.reduce((sum, service) => sum + service.laborPrice, 0);
  const partsTotal = order.parts.reduce((sum, part) => sum + part.quantity * part.unitPrice, 0);
  function changeStatus(status) {
    if (!order) return;
    if (!canMoveWorkOrder(profile, order.status, status, order, inventory)) {
      toast.error(
        getWorkOrderTransitionError(order, status, inventory) ??
          "Seu perfil não pode alterar esta etapa.",
      );
      return;
    }
    const result = setStatus(id, status, profile);
    if (!result?.ok) {
      toast.error(result?.error ?? "Não foi possível atualizar a etapa da OS.");
      return;
    }
    toast.success("Etapa da OS atualizada", { description: WORK_ORDER_STATUS_META[status].label });
  }
  async function removeWorkOrder() {
    if (profile !== "gestor" || !order) return;
    if (!window.confirm(`Excluir ${order.code}? Esta ação não pode ser desfeita.`)) return;
    const result = deleteWorkOrder(order.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const photos = result.evidence.filter((evidence) => evidence.photoId);
    const photoResults = await Promise.allSettled(
      photos.map((evidence) => deleteWorkOrderPhoto(evidence.photoId)),
    );
    if (photoResults.some((item) => item.status === "rejected")) {
      toast.warning("OS excluída; algumas fotos podem ter permanecido no armazenamento local.");
    } else {
      toast.success(`${order.code} excluída`);
    }
    void navigate({ to: "/app/ordens" });
  }
  function handleAddService() {
    if (!canEditQuote) return;
    const name = serviceName.trim();
    const price = Number(servicePrice.replace(",", "."));
    if (!name || !Number.isFinite(price) || price <= 0) {
      toast.error("Informe o serviço e um valor válido.");
      return;
    }
    const added = addService(id, {
      name,
      description: "Serviço incluído no orçamento da OS.",
      laborPrice: price,
      status: "todo",
      approval: "pending",
    });
    if (!added) {
      toast.error("Não foi possível adicionar o serviço a esta OS.");
      return;
    }
    setServiceName("");
    setServicePrice("");
    toast.success("Serviço adicionado ao orçamento");
  }
  function handleAddPart() {
    if (!canEditQuote) return;
    const part = inventory.find((item) => item.id === selectedPart);
    const quantity = Number(partQuantity);
    if (!part) {
      toast.error("Selecione uma peça do estoque.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    const added = addPart(id, {
      partId: part.id,
      name: part.name,
      quantity,
      unitPrice: part.salePrice,
      unitCost: part.costPrice,
      installed: false,
      approval: "pending",
    });
    if (!added) {
      toast.error("Não foi possível adicionar a peça a esta OS.");
      return;
    }
    setSelectedPart("");
    setPartQuantity(1);
    if (part.quantity < quantity) {
      toast.info("Peça adicionada com saldo insuficiente", {
        description: "A baixa só acontece após aprovação e aplicação; a OS aguardará reposição.",
      });
    } else {
      toast.success("Peça adicionada ao orçamento");
    }
  }
  async function savePhotoFiles(files) {
    if (!canEditEvidence || !files.length) return;
    setSavingPhotos(true);
    setPhotoError("");
    let savedCount = 0;
    const errors = [];
    for (const file of files) {
      let uploadId;
      try {
        const savedPhoto = isServerBackedWorkshop
          ? await (async () => {
              const preparedPhoto = await prepareWorkOrderPhoto(file);
              const upload = await createWorkOrderPhotoUpload({
                data: {
                  workOrderId: id,
                  category: evidenceCategory,
                  caption: photoCaption.trim(),
                  originalName: preparedPhoto.filename,
                  contentType: preparedPhoto.contentType,
                  size: preparedPhoto.size,
                },
              });
              uploadId = upload.uploadId;
              const response = await fetch(upload.uploadUrl, {
                method: "PUT",
                mode: "cors",
                credentials: "omit",
                headers: upload.headers,
                body: preparedPhoto.blob,
              });
              if (!response.ok) {
                throw new Error("O armazenamento recusou o envio da foto.");
              }
              return await confirmWorkOrderPhotoUpload({ data: { uploadId } });
            })()
          : await saveWorkOrderPhoto(file);
        addEvidence(id, {
          category: evidenceCategory,
          title: evidenceTitles[evidenceCategory],
          caption: photoCaption.trim() || savedPhoto.originalFileName || savedPhoto.filename,
          variant: allEvidence.length + savedCount,
          photoId: savedPhoto.id,
          id: savedPhoto.id,
          createdAt: savedPhoto.createdAt,
          originalFileName: savedPhoto.originalFileName || savedPhoto.filename,
        });
        savedCount += 1;
      } catch (error) {
        if (isServerBackedWorkshop && uploadId) {
          await cancelWorkOrderPhotoUpload({ data: { uploadId } }).catch(() => {});
        }
        const message =
          error instanceof DOMException && error.name === "QuotaExceededError"
            ? "Armazenamento local cheio. Remova fotos antigas e tente novamente."
            : error instanceof Error
              ? error.message
              : "Não foi possível guardar esta foto.";
        errors.push(`${file.name}: ${message}`);
      }
    }
    setSavingPhotos(false);
    if (savedCount > 0) {
      toast.success(
        savedCount === 1 ? "Foto adicionada à OS" : `${savedCount} fotos adicionadas à OS`,
        {
          description: isServerBackedWorkshop
            ? "Arquivos salvos no armazenamento privado da oficina."
            : "Arquivos guardados somente neste navegador.",
        },
      );
      setPhotoCaption("");
    }
    if (errors.length > 0) {
      const message = errors.slice(0, 2).join(" · ");
      setPhotoError(message);
      toast.error("Algumas fotos não foram adicionadas", { description: message });
    }
  }
  function handlePhotoSelection(event) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    void savePhotoFiles(files);
  }
  async function handleDeleteEvidence(evidence) {
    if (!canEditEvidence || !evidence.photoId || !order) return;
    try {
      if (isServerBackedWorkshop) {
        await deleteWorkOrderPhoto({ data: { photoId: evidence.photoId } });
      } else {
        await deleteLocalWorkOrderPhoto(evidence.photoId);
      }
      removeEvidence(order.id, evidence.id);
      toast.success("Foto removida desta OS");
    } catch {
      toast.error(
        isServerBackedWorkshop
          ? "Não foi possível remover a foto do armazenamento privado."
          : "Não foi possível remover a foto do armazenamento local.",
      );
    }
  }
  function sendQuote() {
    if (!canEditQuote) return;
    if (!hasQuoteItems) {
      toast.error("Adicione pelo menos um serviço ou uma peça antes de enviar o orçamento.");
      return;
    }
    const result = sendQuoteAction(id);
    if (!result?.ok) {
      toast.error(result?.error ?? "Não foi possível enviar o orçamento.");
      return;
    }
    toast.success("Orçamento enviado", {
      description: "Simulação local · nenhuma mensagem foi enviada.",
    });
  }
  function markDelivered() {
    changeStatus("delivered");
  }
  function togglePayment() {
    if (!canManagePayments) return;
    const nextStatus = order.paymentStatus === "paid" ? "pending" : "paid";
    updateWorkOrder(id, { paymentStatus: nextStatus });
    const linkedEntries = financeEntries.filter(
      (entry) => entry.workOrderId === id && entry.type === "receivable",
    );
    if (linkedEntries.length) {
      linkedEntries.forEach((entry) => setFinanceEntryStatus(entry.id, nextStatus));
    } else {
      const entry = createFinanceEntry({
        description: `${order.code} · ${vehicle.plate}`,
        type: "receivable",
        category: "Serviços e peças",
        amount: approvedTotal,
        dueDate: new Date().toISOString(),
        workOrderId: id,
      });
      if (nextStatus === "paid") setFinanceEntryStatus(entry.id, "paid");
    }
    toast.success(
      nextStatus === "paid"
        ? "Pagamento registrado e financeiro atualizado"
        : "Pagamento marcado como pendente",
    );
  }
  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" className="-ml-3">
          <Link to="/app/ordens">
            <ArrowLeft /> Ordens de serviço
          </Link>
        </Button>
      </div>
      <PageHeader
        title={order.code}
        description={`${customer.name} · ${vehicle.make} ${vehicle.model} · ${vehicle.year}`}
        actions={
          <>
            <StatusPill tone={statusMeta.tone}>{statusMeta.label}</StatusPill>
            {order.priority === "urgent" && <StatusPill tone="danger">Prioridade alta</StatusPill>}
            {profile === "gestor" && !["delivered", "cancelled"].includes(order.status) && (
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm(`Cancelar ${order.code}?`)) changeStatus("cancelled");
                }}
              >
                Cancelar OS
              </Button>
            )}
            {profile === "gestor" && (
              <Button
                variant="ghost"
                onClick={removeWorkOrder}
                aria-label={`Excluir ${order.code}`}
              >
                <Trash2 /> Excluir
              </Button>
            )}
          </>
        }
      />
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Próxima ação
          </p>
          <p className="mt-1 font-bold">
            {nextStatus
              ? `Avançar para ${WORK_ORDER_STATUS_META[nextStatus].label.toLowerCase()}`
              : order.status === "delivered"
                ? "OS concluída · confira o histórico"
                : order.status === "cancelled"
                  ? "OS cancelada · confira o histórico"
                  : order.status === "awaiting-approval"
                    ? order.approval === "rejected"
                      ? "Orçamento recusado · revise os itens"
                      : order.approval === "not-sent"
                        ? "Prepare o orçamento para enviar ao cliente"
                        : "Aguardando retorno do cliente"
                    : "Revise os itens para avançar"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aberta em {formatDateTime(order.openedAt)} · previsão {formatDate(order.expectedAt)} ·
            atualizado {formatDateTime(order.updatedAt)}
          </p>
        </div>
        {nextStatus && canMoveWorkOrder(profile, order.status, nextStatus) && (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Button
              variant="glow"
              disabled={!canChangeToNextStatus}
              title={nextStatusError ?? undefined}
              onClick={() =>
                nextStatus === "delivered" ? markDelivered() : changeStatus(nextStatus)
              }
            >
              {nextStatus === "delivered" ? "Registrar saída" : "Avançar etapa"}
              <ArrowRight />
            </Button>
            {nextStatusError && (
              <p className="max-w-sm text-xs text-warning" role="status">
                {nextStatusError}
              </p>
            )}
          </div>
        )}
      </div>
      <div
        className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-5"
        aria-label="Progresso da ordem de serviço"
      >
        {["intake", "diagnosis", "awaiting-approval", "in-progress", "ready"].map(
          (status, index) => {
            const active = order.status === status;
            const done =
              [
                "intake",
                "diagnosis",
                "awaiting-approval",
                "waiting-parts",
                "in-progress",
                "ready",
                "delivered",
              ].indexOf(order.status) >= index;
            return (
              <div
                key={status}
                className={`rounded-xl border p-3 transition ${active ? "border-primary/45 bg-primary/10" : "border-border bg-card/50"}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`grid size-6 place-items-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {done ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  <span className="text-xs font-semibold">
                    {WORK_ORDER_STATUS_META[status].label}
                  </span>
                </div>
              </div>
            );
          },
        )}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <section id="resumo">
            <SectionTitle icon={ClipboardCheck} title="Resumo da entrada" />
            <GlassCard className="grid gap-5 p-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Relato do cliente
                </p>
                {canEditIntake ? (
                  <textarea
                    id="work-order-complaint"
                    className="mt-2 min-h-24 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Relato do cliente"
                    value={order.complaint}
                    onChange={(event) =>
                      updateWorkOrder(order.id, { complaint: event.target.value })
                    }
                  />
                ) : (
                  <p className="mt-2 text-sm leading-6">{order.complaint}</p>
                )}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground">Diagnóstico técnico</p>
                  {canEditDiagnosis ? (
                    <textarea
                      id="diagnosis"
                      className="mt-2 min-h-24 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={order.diagnosis}
                      placeholder="Registre a avaliação técnica..."
                      onChange={(event) =>
                        updateWorkOrder(order.id, { diagnosis: event.target.value })
                      }
                    />
                  ) : (
                    <p className="mt-2 min-h-12 text-sm leading-6 text-foreground">
                      {order.diagnosis || "Diagnóstico ainda não registrado."}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {canEditIntake ? (
                  <label className="rounded-xl bg-muted/60 p-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Quilometragem (km)
                    <input
                      className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2 text-xs font-semibold normal-case text-foreground"
                      type="number"
                      min="0"
                      step="1"
                      value={order.mileageIn}
                      onChange={(event) =>
                        updateWorkOrder(order.id, {
                          mileageIn: Math.max(0, Number(event.target.value)),
                        })
                      }
                    />
                  </label>
                ) : (
                  <InfoStat
                    label="Quilometragem"
                    value={`${order.mileageIn.toLocaleString("pt-BR")} km`}
                  />
                )}
                {canEditIntake ? (
                  <label className="rounded-xl bg-muted/60 p-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Combustível na entrada (%)
                    <input
                      className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2 text-xs font-semibold normal-case text-foreground"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={order.fuelPercent}
                      onChange={(event) =>
                        updateWorkOrder(order.id, {
                          fuelPercent: Math.min(100, Math.max(0, Number(event.target.value))),
                        })
                      }
                    />
                  </label>
                ) : (
                  <InfoStat label="Combustível na entrada" value={`${order.fuelPercent}%`} />
                )}
                {canEditAssignment ? (
                  <>
                    <label className="rounded-xl bg-muted/60 p-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Responsável técnico
                      <select
                        className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2 text-xs font-semibold normal-case text-foreground"
                        value={order.mechanic ?? ""}
                        onChange={(event) =>
                          updateWorkOrder(order.id, { mechanic: event.target.value })
                        }
                      >
                        <option value="">Sem responsável</option>
                        {mechanics.map((mechanic) => (
                          <option key={mechanic}>{mechanic}</option>
                        ))}
                        {order.mechanic && !mechanics.includes(order.mechanic) ? (
                          <option value={order.mechanic}>{order.mechanic}</option>
                        ) : null}
                      </select>
                    </label>
                    <label className="rounded-xl bg-muted/60 p-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Previsão de entrega
                      <input
                        className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2 text-xs font-semibold normal-case text-foreground"
                        type="date"
                        value={new Date(order.expectedAt).toISOString().slice(0, 10)}
                        onChange={(event) =>
                          event.target.value &&
                          updateWorkOrder(order.id, {
                            expectedAt: new Date(`${event.target.value}T12:00:00`).toISOString(),
                          })
                        }
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <InfoStat label="Responsável técnico" value={order.mechanic} />
                    <InfoStat label="Previsão de entrega" value={formatDate(order.expectedAt)} />
                  </>
                )}
                {canViewPrices && (
                  <InfoStat label="Orçamento total" value={formatBRL(total)} strong />
                )}
              </div>
            </GlassCard>
          </section>

          <section id="inspecao">
            <SectionTitle icon={Wrench} title="Inspeção e execução" />
            <GlassCard className="space-y-4 p-5">
              {quoteIsEditable && (
                <div className="grid gap-3 md:grid-cols-[1fr_150px_auto]">
                  <input
                    className={inputClass}
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="Nome do serviço"
                    aria-label="Nome do serviço"
                  />
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="Valor (R$)"
                    aria-label="Valor do serviço"
                  />
                  <Button onClick={handleAddService} variant="outline">
                    <Plus /> Serviço
                  </Button>
                </div>
              )}
              {order.services.length ? (
                <div className="divide-y divide-border rounded-xl border border-border">
                  {order.services.map((service) => (
                    <div
                      key={service.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        {canExecute &&
                          service.approval === "approved" &&
                          ["in-progress", "waiting-parts"].includes(order.status) && (
                            <button
                              aria-label={`${service.status === "done" ? "Reabrir" : "Concluir"} ${service.name}`}
                              onClick={() =>
                                setServiceStatus(
                                  order.id,
                                  service.id,
                                  service.status === "done" ? "todo" : "done",
                                )
                              }
                              className="mt-0.5 text-primary"
                            >
                              {service.status === "done" ? (
                                <CheckCircle2 className="size-5" />
                              ) : (
                                <Circle className="size-5" />
                              )}
                            </button>
                          )}
                        <div>
                          <p className="text-sm font-semibold">{service.name}</p>
                          <p className="text-xs text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                          tone={
                            service.status === "done"
                              ? "success"
                              : service.status === "in-progress"
                                ? "info"
                                : "neutral"
                          }
                        >
                          {service.status === "done"
                            ? "Concluído"
                            : service.status === "in-progress"
                              ? "Em andamento"
                              : "Por fazer"}
                        </StatusPill>
                        {canExecute &&
                          service.approval === "approved" &&
                          ["in-progress", "waiting-parts"].includes(order.status) && (
                            <select
                              className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                              aria-label={`Execução de ${service.name}`}
                              value={service.status}
                              onChange={(event) =>
                                setServiceStatus(order.id, service.id, event.target.value)
                              }
                            >
                              <option value="todo">Por fazer</option>
                              <option value="in-progress">Em andamento</option>
                              <option value="done">Concluído</option>
                            </select>
                          )}
                        {canApproveQuote && (
                          <select
                            className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                            aria-label={`Aprovação de ${service.name}`}
                            value={service.approval}
                            disabled={order.status !== "awaiting-approval"}
                            onChange={(e) =>
                              setServiceApproval(order.id, service.id, e.target.value)
                            }
                          >
                            <option value="pending">Aguardando</option>
                            <option value="approved">Aprovado</option>
                            <option value="rejected">Recusado</option>
                          </select>
                        )}
                        {canViewPrices && (
                          <strong className="font-mono text-sm">
                            {formatBRL(service.laborPrice)}
                          </strong>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  Inclua serviços para compor o orçamento.
                </p>
              )}
              {quoteIsEditable && (
                <div className="grid gap-3 border-t border-border pt-4 md:grid-cols-[1fr_100px_auto]">
                  <select
                    className={inputClass}
                    value={selectedPart}
                    onChange={(e) => setSelectedPart(e.target.value)}
                    aria-label="Peça do estoque"
                  >
                    <option value="">Selecionar peça do estoque</option>
                    {inventory.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.code} · {part.name} · saldo {part.quantity}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(Math.max(1, Number(e.target.value)))}
                    aria-label="Quantidade"
                  />
                  <Button variant="outline" onClick={handleAddPart}>
                    <Plus /> Peça
                  </Button>
                </div>
              )}
              {order.parts.length > 0 && (
                <div className="divide-y divide-border rounded-xl border border-border">
                  {order.parts.map((usage) => (
                    <div
                      key={usage.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {usage.name}{" "}
                          <span className="text-muted-foreground">× {usage.quantity}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {usage.installed
                            ? "Aplicada no veículo · saldo baixado"
                            : "Prevista · ainda não baixada do estoque"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {canApproveQuote && (
                          <select
                            className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                            aria-label={`Aprovação de ${usage.name}`}
                            value={usage.approval}
                            disabled={usage.installed || order.status !== "awaiting-approval"}
                            onChange={(e) => setPartApproval(order.id, usage.id, e.target.value)}
                          >
                            <option value="pending">Aguardando</option>
                            <option value="approved">Aprovado</option>
                            <option value="rejected">Recusado</option>
                          </select>
                        )}
                        {canViewPrices && (
                          <strong className="font-mono text-sm">
                            {formatBRL(usage.quantity * usage.unitPrice)}
                          </strong>
                        )}
                        {canExecute && ["in-progress", "waiting-parts"].includes(order.status) && (
                          <Button
                            size="sm"
                            variant={usage.installed ? "secondary" : "outline"}
                            disabled={usage.approval !== "approved"}
                            title={
                              usage.approval !== "approved"
                                ? "A peça precisa ser aprovada antes da aplicação."
                                : undefined
                            }
                            onClick={() => {
                              const target = !usage.installed;
                              const stock = inventory.find((item) => item.id === usage.partId);
                              if (target && (stock?.quantity ?? 0) < usage.quantity) {
                                toast.error("Saldo insuficiente para aplicar esta peça.");
                                return;
                              }
                              setPartInstalled(order.id, usage.id, target);
                              toast.success(
                                target
                                  ? "Peça aplicada e estoque atualizado"
                                  : "Peça removida da aplicação e saldo estornado",
                              );
                            }}
                          >
                            {usage.installed ? "Aplicada" : "Marcar aplicada"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </section>

          <section id="orcamento">
            <SectionTitle icon={CheckCircle2} title="Orçamento e aprovação" />
            <GlassCard className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Situação do retorno
                  </p>
                  <div className="mt-2">
                    <StatusPill tone={approvalTone(order.approval)}>
                      {approvalLabel(order.approval)}
                    </StatusPill>
                  </div>
                </div>
                {canViewPrices && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total estimado</p>
                    <p className="font-mono text-2xl font-extrabold">{formatBRL(total)}</p>
                    <p className="text-xs text-muted-foreground">
                      Serviços {formatBRL(laborTotal)} · Peças {formatBRL(partsTotal)}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {quoteIsEditable && (
                  <Button
                    variant="glass"
                    onClick={sendQuote}
                    disabled={
                      !hasQuoteItems || !["diagnosis", "awaiting-approval"].includes(order.status)
                    }
                    title={
                      !hasQuoteItems ? "Adicione um serviço ou uma peça ao orçamento." : undefined
                    }
                  >
                    <Send /> Enviar orçamento{" "}
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      Simulado
                    </span>
                  </Button>
                )}
                {canApproveQuote && (
                  <Button
                    variant="outline"
                    disabled={!hasQuoteItems || !canRecordApproval || !hasPendingApprovalItems}
                    title={
                      !hasQuoteItems ? "Adicione um serviço ou uma peça ao orçamento." : undefined
                    }
                    onClick={() => {
                      setApproval(order.id, "approved");
                      toast.success("Orçamento aprovado na demonstração");
                    }}
                  >
                    Aprovar
                  </Button>
                )}
                {canApproveQuote && (
                  <Button
                    variant="outline"
                    disabled={quoteItemCount < 2 || !canRecordApproval || !hasPendingApprovalItems}
                    title={
                      quoteItemCount < 2
                        ? "A aprovação parcial exige pelo menos dois itens no orçamento."
                        : undefined
                    }
                    onClick={() => {
                      setApproval(order.id, "partial");
                      toast.success("Aprovação parcial registrada");
                    }}
                  >
                    Aprovar parcialmente
                  </Button>
                )}
                {canApproveQuote && (
                  <Button
                    variant="outline"
                    disabled={!hasQuoteItems || !canRecordApproval || !hasPendingApprovalItems}
                    title={
                      !hasQuoteItems ? "Adicione um serviço ou uma peça ao orçamento." : undefined
                    }
                    onClick={() => {
                      setApproval(order.id, "rejected");
                      toast.success("Recusa registrada");
                    }}
                  >
                    Recusar
                  </Button>
                )}
              </div>
              {(canEditQuote || canApproveQuote) && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {!hasQuoteItems
                    ? "Adicione um serviço ou uma peça para habilitar o envio e a resposta ao orçamento."
                    : "Envios e retornos são simulações locais; nenhuma mensagem externa é enviada."}
                </p>
              )}
            </GlassCard>
          </section>

          <section id="damage">
            <SectionTitle icon={ClipboardCheck} title="Mapa de avarias na entrada" />
            <GlassCard className="p-5">
              <p className="mb-3 text-sm text-muted-foreground">
                Toque nas regiões com marcas ou danos percebidos no recebimento.
              </p>
              <div className="relative mx-auto aspect-[2/1] max-w-lg">
                <svg
                  viewBox="0 0 420 210"
                  role="img"
                  aria-label="Silhueta ilustrativa de veículo vista de cima"
                  className="absolute inset-0 h-full w-full"
                >
                  <path
                    d="M53 105c8-8 18-15 25-27l20-48c5-12 15-18 29-18h166c14 0 24 6 29 18l20 48c7 12 17 19 25 27-8 8-18 15-25 27l-20 48c-5 12-15 18-29 18H127c-14 0-24-6-29-18l-20-48c-7-12-17-19-25-27Z"
                    fill="var(--muted)"
                    stroke="var(--border)"
                    strokeWidth="4"
                  />
                  <path
                    d="M127 30h166l-18 42H145zM109 84h202v42H109zM127 150h166l18 42H109z"
                    fill="var(--background-2)"
                    stroke="var(--border)"
                    strokeWidth="2"
                  />
                  <path
                    d="M145 75h130l22 30-22 30H145l-22-30z"
                    fill="var(--card)"
                    stroke="var(--border)"
                    strokeWidth="2"
                  />
                  <path
                    d="M64 66h32m228 0h32M64 144h32m228 0h32"
                    stroke="var(--foreground)"
                    strokeOpacity=".55"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M192 16v178"
                    stroke="var(--border)"
                    strokeDasharray="4 6"
                    strokeWidth="2"
                  />
                </svg>
                {damageZones.map((zone) => {
                  const active = order.damageAreas.includes(zone.id);
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      disabled={!canEditIntake && !canExecute}
                      aria-pressed={active}
                      onClick={() => {
                        if (!canEditIntake && !canExecute) return;
                        toggleDamageArea(order.id, zone.id);
                        toast.success(
                          active
                            ? `Região ${zone.label.toLowerCase()} desmarcada`
                            : `Avaria na região ${zone.label.toLowerCase()} registrada`,
                        );
                      }}
                      className={`absolute ${zone.position} z-10 min-h-9 rounded-full border px-3 text-xs font-bold shadow-lg transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/90 text-foreground hover:border-primary/50"}`}
                    >
                      {active ? `✓ ${zone.label}` : zone.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {order.damageAreas.length
                  ? `${order.damageAreas.length} região(ões) marcadas · evidências podem ser registradas na seção Fotos`
                  : "Nenhuma avaria marcada"}
              </p>
            </GlassCard>
          </section>

          <section id="checklists">
            <SectionTitle icon={ClipboardCheck} title="Checklists de entrada e saída" />
            <div className="grid gap-4 lg:grid-cols-2">
              <ChecklistCard
                title="Conferência de entrada"
                items={order.entryChecklist}
                onToggle={(itemId) => toggleChecklist(order.id, "entryChecklist", itemId)}
                readOnly={!canEditChecklists || !canEditIntake}
              />
              <ChecklistCard
                title="Preparação para entrega"
                items={order.exitChecklist}
                onToggle={(itemId) => toggleChecklist(order.id, "exitChecklist", itemId)}
                readOnly={!canEditChecklists || !canExecute}
              />
            </div>
          </section>

          <section id="fotos">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <SectionTitle icon={Camera} title="Fotos e evidências" />
            </div>
            {canEditEvidence && (
              <GlassCard className="mb-4 space-y-3 p-4">
                <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto_auto]">
                  <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                    Categoria da foto
                    <select
                      className={inputClass}
                      value={evidenceCategory}
                      onChange={(event) => setEvidenceCategory(event.target.value)}
                      aria-label="Categoria da foto"
                    >
                      {Object.entries(evidenceLabels).map(([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                    Observação
                    <input
                      className={inputClass}
                      value={photoCaption}
                      onChange={(event) => setPhotoCaption(event.target.value)}
                      placeholder="Ex.: risco no para-choque dianteiro"
                      aria-label="Observação da foto"
                      maxLength={120}
                    />
                  </label>
                  <input
                    ref={photoInputRef}
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    multiple
                    aria-label="Selecionar fotos do dispositivo"
                    onChange={handlePhotoSelection}
                  />
                  <input
                    ref={cameraInputRef}
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    aria-label="Tirar foto com a câmera"
                    onChange={handlePhotoSelection}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="self-end"
                    disabled={savingPhotos}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <ImagePlus /> Selecionar fotos
                  </Button>
                  <Button
                    type="button"
                    variant="glow"
                    className="self-end"
                    disabled={savingPhotos}
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera /> Tirar foto
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <p>
                    JPG, PNG, WebP ou formato aceito pelo navegador · até 20 MB por foto. Arquivos
                    ficam neste dispositivo.
                  </p>
                  {savingPhotos && (
                    <p role="status" aria-live="polite" className="inline-flex items-center gap-2">
                      <Upload className="size-3.5 animate-pulse" /> Guardando fotos…
                    </p>
                  )}
                </div>
                {photoError && (
                  <p role="alert" className="text-sm text-destructive">
                    {photoError}
                  </p>
                )}
              </GlassCard>
            )}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {allEvidence.length} registro(s) · fotos vinculadas a esta ordem
              </p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Filtrar
                <select
                  className={`${inputClass} h-9 min-w-36`}
                  value={evidenceFilter}
                  onChange={(event) => setEvidenceFilter(event.target.value)}
                  aria-label="Filtrar fotos por categoria"
                >
                  <option value="all">Todas as categorias</option>
                  {Object.entries(evidenceLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {allEvidence.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Camera className="mx-auto size-7 text-muted-foreground" />
                <p className="mt-2 font-semibold">Nenhuma foto registrada</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adicione imagens da entrada, avarias, peças, execução ou entrega.
                </p>
              </GlassCard>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allEvidence
                  .filter((evidence) =>
                    evidenceFilter === "all" ? true : evidence.category === evidenceFilter,
                  )
                  .map((evidence) => (
                    <WorkOrderEvidencePhoto
                      key={evidence.id}
                      evidence={evidence}
                      categoryLabel={`${evidenceLabels[evidence.category]} · ${formatDateTime(evidence.createdAt)}`}
                      caption={evidence.caption}
                      {...(canDeleteEvidence ? { onDelete: handleDeleteEvidence } : {})}
                    />
                  ))}
              </div>
            )}
            {allEvidence.length > 0 &&
              allEvidence.filter((evidence) =>
                evidenceFilter === "all" ? false : evidence.category === evidenceFilter,
              ).length === 0 && (
                <GlassCard className="p-6 text-center text-sm text-muted-foreground">
                  Nenhuma evidência nesta categoria.
                </GlassCard>
              )}
          </section>

          <section id="comparador">
            <SectionTitle icon={Camera} title="Entrada × saída" />
            <GlassCard className="p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Comparador ilustrativo: arraste o controle para revelar cada registro.
              </p>
              <div className="relative aspect-[16/8] overflow-hidden rounded-2xl">
                <WorkOrderEvidenceView
                  evidence={exitPhoto}
                  title="Saída"
                  caption="Registro de entrega"
                  className="absolute inset-0 h-full w-full aspect-auto rounded-none border-0"
                />
                <div
                  className="absolute inset-0 border-r-2 border-primary"
                  style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
                >
                  <WorkOrderEvidenceView
                    evidence={entryPhoto}
                    title="Entrada"
                    caption="Registro de recebimento"
                    className="absolute inset-0 h-full w-full aspect-auto rounded-none border-0"
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 z-10"
                  style={{ left: `${slider}%` }}
                >
                  <span className="absolute left-0 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-primary text-white shadow-xl">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={slider}
                  onChange={(e) => setSlider(Number(e.target.value))}
                  aria-label="Comparar foto de entrada e saída"
                  className="absolute inset-x-0 bottom-3 z-20 mx-auto w-[calc(100%-2rem)] accent-primary"
                />
              </div>
            </GlassCard>
          </section>

          <section id="historico">
            <SectionTitle icon={Clock3} title="Linha do tempo" />
            <GlassCard className="p-5">
              <ol className="space-y-0">
                {order.timeline.map((event, index) => (
                  <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                    <div className="relative flex flex-col items-center">
                      <span className="z-10 mt-1 size-2.5 rounded-full bg-primary ring-4 ring-primary/10" />
                      {index < order.timeline.length - 1 && (
                        <span className="absolute top-4 h-full w-px bg-border" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{event.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{event.detail}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.actor} · {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </GlassCard>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <GlassCard className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Veículo</h2>
              <Plate value={vehicle.plate} size="sm" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {vehicle.make} {vehicle.model}
              </p>
              <p className="text-sm text-muted-foreground">
                {vehicle.color} · {vehicle.year}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoStat label="Entrada" value={`${order.mileageIn.toLocaleString("pt-BR")} km`} />
              <InfoStat label="Combustível" value={`${order.fuelPercent}%`} />
            </div>
            {hasPermission(profile, "viewVehicles") && (
              <Link
                to="/app/veiculos"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Ver veículos <ArrowRight className="size-4" />
              </Link>
            )}
          </GlassCard>
          <GlassCard className="space-y-3 p-5">
            <h2 className="font-bold">Cliente</h2>
            <p className="font-semibold">{customer.name}</p>
            {profile !== "mecanico" && (
              <>
                <p className="font-mono text-sm text-muted-foreground">{customer.phone}</p>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
              </>
            )}
            {hasPermission(profile, "viewCustomers") && (
              <Link
                to="/app/clientes"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Abrir cadastro <ArrowRight className="size-4" />
              </Link>
            )}
          </GlassCard>
          {canViewPrices && (
            <GlassCard className="space-y-3 p-5">
              <h2 className="font-bold">Resumo do orçamento</h2>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mão de obra</span>
                <span className="font-mono">{formatBRL(laborTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Peças</span>
                <span className="font-mono">{formatBRL(partsTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 font-bold">
                <span>Total</span>
                <span className="font-mono">{formatBRL(total)}</span>
              </div>
              {hasPermission(profile, "viewFinance") && (
                <StatusPill tone={order.paymentStatus === "paid" ? "success" : "warning"}>
                  {order.paymentStatus === "paid" ? "Pago" : "Pendente"}
                </StatusPill>
              )}
              {canManagePayments && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={togglePayment}
                    disabled={approvedTotal <= 0}
                    title={
                      approvedTotal <= 0
                        ? "Aprove ao menos um serviço ou uma peça com valor."
                        : undefined
                    }
                  >
                    {order.paymentStatus === "paid" ? "Reabrir pagamento" : "Registrar recebimento"}
                  </Button>
                  {approvedTotal <= 0 && (
                    <p className="text-xs text-muted-foreground">
                      Aprove um item com valor no orçamento antes de registrar o recebimento.
                    </p>
                  )}
                </>
              )}
            </GlassCard>
          )}
        </aside>
      </div>
    </>
  );
}
function SectionTitle({ icon: Icon, title }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
      <Icon className="size-4 text-primary" />
      {title}
    </h2>
  );
}
function InfoStat({ label, value, strong = false }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-sm ${strong ? "font-mono font-bold text-primary" : "font-semibold"}`}
      >
        {value}
      </p>
    </div>
  );
}
function ChecklistCard({ title, items, onToggle, readOnly = false }) {
  return (
    <GlassCard className="p-5">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div className="space-y-1">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm transition ${readOnly ? "cursor-default" : "cursor-pointer hover:bg-accent/60"}`}
          >
            <input
              className="size-4 accent-primary"
              type="checkbox"
              checked={item.checked}
              disabled={readOnly}
              onChange={() => onToggle(item.id)}
            />
            <span className={item.checked ? "text-muted-foreground line-through" : ""}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </GlassCard>
  );
}
function approvalLabel(status) {
  return (
    {
      "not-sent": "Não enviado",
      pending: "Aguardando retorno",
      approved: "Aprovado",
      partial: "Aprovado parcialmente",
      rejected: "Recusado",
    }[status] ?? status
  );
}
function approvalTone(status) {
  return status === "approved"
    ? "success"
    : status === "partial" || status === "pending"
      ? "warning"
      : status === "rejected"
        ? "danger"
        : "neutral";
}

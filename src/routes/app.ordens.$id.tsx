import { createFileRoute } from "@tanstack/react-router";
import { WorkOrderDetailPage } from "@/features/work-orders/pages/WorkOrderDetailPage";

export const Route = createFileRoute("/app/ordens/$id")({
  head: () => ({ meta: [{ title: "Detalhe da OS — Torque" }] }),
  component: WorkOrderDetailRoute,
});

function WorkOrderDetailRoute() {
  const { id } = Route.useParams();
  return <WorkOrderDetailPage id={id} />;
}

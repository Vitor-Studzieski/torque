import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/ordens")({ component: OrdersLayout });

function OrdersLayout() {
  return <Outlet />;
}

import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Car,
  Wallet,
  Package,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; mobile?: boolean };

export const NAV: NavItem[] = [
  { to: "/app", label: "Visão geral", icon: LayoutDashboard, mobile: true },
  { to: "/app/ordens", label: "Ordens de serviço", icon: ClipboardList, mobile: true },
  { to: "/app/clientes", label: "Clientes", icon: Users, mobile: true },
  { to: "/app/veiculos", label: "Veículos", icon: Car, mobile: true },
  { to: "/app/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/app/estoque", label: "Estoque e peças", icon: Package },
  { to: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings },
];

export function isActive(path: string, to: string) {
  return to === "/app" ? path === "/app" || path === "/app/" : path.startsWith(to);
}

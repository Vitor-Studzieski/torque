import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";

export function ComingSoon({ title, description, icon, phase }: { title: string; description: string; icon: LucideIcon; phase: number }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title={`Módulo previsto para a Fase ${phase}`}
        description="A estrutura de navegação já está pronta. Os dados de demonstração e as telas deste módulo entram na próxima etapa."
        action={<Button variant="glass" asChild><Link to="/app">Voltar à visão geral</Link></Button>}
      />
    </>
  );
}

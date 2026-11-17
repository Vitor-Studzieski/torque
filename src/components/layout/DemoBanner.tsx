import { FlaskConical } from "lucide-react";
export function DemoBanner() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-7 items-center justify-center gap-2 border-b border-info/20 bg-background/80 text-[11px] font-semibold text-info backdrop-blur">
      <FlaskConical className="size-3.5" aria-hidden /> Ambiente de demonstração, dados fictícios
    </div>
  );
}

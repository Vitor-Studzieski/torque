import { toast } from "sonner";
/** Feedback for actions that would depend on an external service. */
export function simulate(action: string) {
  toast(action, {
    description: "Simulado — nenhuma mensagem ou cobrança real foi enviada.",
    icon: "◎",
  });
}

import { useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteWorkshopMember } from "@/features/auth/api/invitations";

const roleOptions = {
  owner: [
    { value: "manager", label: "Gerente" },
    { value: "attendant", label: "Atendimento" },
    { value: "mechanic", label: "Mecânico" },
    { value: "finance", label: "Financeiro" },
  ],
  manager: [
    { value: "attendant", label: "Atendimento" },
    { value: "mechanic", label: "Mecânico" },
    { value: "finance", label: "Financeiro" },
  ],
};

export function TeamInviteForm({ role }) {
  const roles = roleOptions[role] ?? [];
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState(roles[0]?.value ?? "");
  const [sending, setSending] = useState(false);

  if (!roles.length) return null;

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    try {
      await inviteWorkshopMember({ data: { email, role: memberRole } });
      toast.success(`Convite enviado para ${email.trim()}.`);
      setEmail("");
      window.dispatchEvent(new Event("torque:team-refresh"));
    } catch {
      toast.error("Não foi possível enviar o convite. Confira o e-mail e tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border-t border-border pt-5 text-left">
      <div>
        <h2 className="font-bold">Convidar equipe</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          O convite será enviado por e-mail. A pessoa só acessa a oficina depois de aceitá-lo.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="team-invite-email">E-mail da pessoa</Label>
        <Input
          id="team-invite-email"
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="pessoa@oficina.com.br"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="team-invite-role">Perfil</Label>
        <Select value={memberRole} onValueChange={setMemberRole}>
          <SelectTrigger id="team-invite-role" aria-label="Perfil para o convite">
            <SelectValue placeholder="Selecione um perfil" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" variant="glow" disabled={sending || !memberRole}>
        {sending ? <LoaderCircle className="animate-spin" /> : <Send />}
        {sending ? "Enviando convite…" : "Enviar convite"}
      </Button>
    </form>
  );
}

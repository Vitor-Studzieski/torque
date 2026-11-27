import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, ShieldOff, UserRoundCog, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/torque/GlassCard";
import { formatDateTime } from "@/lib/format";
import {
  deactivateWorkshopMember,
  getWorkshopTeam,
  revokeWorkshopInvitation,
  updateWorkshopMemberRole,
} from "@/features/auth/api/invitations";

const roleLabels = {
  owner: "Proprietário",
  manager: "Gerente",
  attendant: "Atendimento",
  mechanic: "Mecânico",
  finance: "Financeiro",
};
const invitationStatus = {
  creating: "Preparando envio",
  pending: "Pendente",
  accepted: "Aceito",
  revoked: "Cancelado",
  failed: "Falhou",
};

export function TeamManagement({ role }) {
  const [team, setTeam] = useState({ members: [], invitations: [] });
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const canManageMembers = role === "owner";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTeam(await getWorkshopTeam());
    } catch {
      toast.error("Não foi possível carregar os dados da equipe.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("torque:team-refresh", refresh);
    return () => window.removeEventListener("torque:team-refresh", refresh);
  }, [load]);

  async function changeRole(member, nextRole) {
    if (!canManageMembers || nextRole === member.role) return;
    setBusyKey(member.userId);
    try {
      await updateWorkshopMemberRole({ data: { userId: member.userId, role: nextRole } });
      toast.success(`Perfil de ${member.name} atualizado.`);
      await load();
    } catch {
      toast.error("Não foi possível alterar o perfil deste membro.");
    } finally {
      setBusyKey("");
    }
  }

  async function removeMember(member) {
    if (!canManageMembers || !window.confirm(`Revogar o acesso de ${member.name}?`)) return;
    setBusyKey(member.userId);
    try {
      await deactivateWorkshopMember({ data: { userId: member.userId } });
      toast.success(`Acesso de ${member.name} revogado.`);
      await load();
    } catch {
      toast.error("Não foi possível revogar o acesso deste membro.");
    } finally {
      setBusyKey("");
    }
  }

  async function revokeInvite(invitation) {
    setBusyKey(invitation.id);
    try {
      await revokeWorkshopInvitation({ data: { id: invitation.id } });
      toast.success(`Convite de ${invitation.email} cancelado.`);
      await load();
    } catch {
      toast.error("Não foi possível cancelar este convite.");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="mt-6 space-y-4 border-t border-border pt-5 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Equipe da oficina</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {canManageMembers
              ? "Altere perfis ou revogue o acesso de membros."
              : "Você pode consultar a equipe e cancelar os convites que enviou."}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Atualizar equipe"
        >
          {loading ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
        </Button>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <h3 className="border-b border-border px-4 py-3 text-sm font-semibold">Membros ativos</h3>
        {loading ? (
          <p role="status" className="p-4 text-sm text-muted-foreground">
            Carregando equipe…
          </p>
        ) : team.members.length ? (
          <ul className="divide-y divide-border">
            {team.members
              .filter((member) => member.active)
              .map((member) => (
                <li key={member.userId} className="flex flex-wrap items-center gap-3 p-4">
                  <span
                    className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"
                    aria-hidden="true"
                  >
                    <UserRoundCog className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{member.name}</strong>
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  </span>
                  {canManageMembers && member.role !== "owner" ? (
                    <label className="sr-only" htmlFor={`member-role-${member.userId}`}>
                      Perfil de {member.name}
                    </label>
                  ) : null}
                  {canManageMembers && member.role !== "owner" ? (
                    <select
                      id={`member-role-${member.userId}`}
                      className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
                      value={member.role}
                      disabled={busyKey === member.userId}
                      onChange={(event) => void changeRole(member, event.target.value)}
                    >
                      {Object.entries(roleLabels)
                        .filter(([value]) => value !== "owner")
                        .map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      {roleLabels[member.role] ?? member.role}
                    </span>
                  )}
                  {canManageMembers && member.role !== "owner" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Revogar acesso de ${member.name}`}
                      title="Revogar acesso"
                      disabled={busyKey === member.userId}
                      onClick={() => void removeMember(member)}
                    >
                      <ShieldOff />
                    </Button>
                  )}
                </li>
              ))}
          </ul>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">Nenhum membro ativo encontrado.</p>
        )}
      </GlassCard>

      <GlassCard className="overflow-hidden p-0">
        <h3 className="border-b border-border px-4 py-3 text-sm font-semibold">Convites</h3>
        {!loading && team.invitations.length ? (
          <ul className="divide-y divide-border">
            {team.invitations.map((invitation) => {
              const isPending =
                invitation.status === "pending" && new Date(invitation.expiresAt) > new Date();
              return (
                <li key={invitation.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{invitation.email}</strong>
                    <span className="text-xs text-muted-foreground">
                      {roleLabels[invitation.role] ?? invitation.role} · enviado em{" "}
                      {formatDateTime(invitation.createdAt)}
                    </span>
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs ${isPending ? "border-warning/30 bg-warning/10 text-warning" : "border-border text-muted-foreground"}`}
                  >
                    {isPending
                      ? invitationStatus.pending
                      : invitation.status === "pending"
                        ? "Expirado"
                        : (invitationStatus[invitation.status] ?? invitation.status)}
                  </span>
                  {isPending && invitation.canRevoke && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Cancelar convite de ${invitation.email}`}
                      title="Cancelar convite"
                      disabled={busyKey === invitation.id}
                      onClick={() => void revokeInvite(invitation)}
                    >
                      {busyKey === invitation.id ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <X />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : !loading ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum convite registrado.</p>
        ) : null}
      </GlassCard>
    </div>
  );
}

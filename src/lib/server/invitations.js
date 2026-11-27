import { getRequest } from "@tanstack/react-start/server";
import { clerkClient } from "@clerk/tanstack-react-start/server";
import { withAuthorizedWorkshopTransaction } from "@/lib/server/workshop-access";
import { withWorkshopTransaction, writeAuditEvent } from "@/lib/server/database";

const invitationRoles = new Set(["manager", "attendant", "mechanic", "finance"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function sendWorkshopInvitation(data) {
  const request = getRequest();
  const invitation = await withAuthorizedWorkshopTransaction(
    request,
    {
      permission: "team:invite",
      rateLimit: { scope: "team-invitation-create", maximum: 10, windowSeconds: 3600 },
    },
    async (client, membership) => {
      if (membership.role === "manager" && data.role === "manager") {
        throw new Error("Gerentes não podem convidar outros gerentes.");
      }

      const existingMember = await client.query(
        `SELECT 1 FROM workshop_memberships
         WHERE workshop_id = $1 AND lower(email) = $2 AND active = true
         LIMIT 1`,
        [membership.workshopId, data.email],
      );
      if (existingMember.rowCount) {
        throw new Error("Este e-mail já pertence à equipe da oficina.");
      }

      const { rows } = await client.query(
        `INSERT INTO workshop_invitations
           (workshop_id, email, role, status, invited_by_user_id)
         VALUES ($1, $2, $3, 'creating', $4)
         RETURNING id`,
        [membership.workshopId, data.email, data.role, membership.userId],
      );
      await writeAuditEvent(client, membership, {
        action: "team.invitation.create_requested",
        entityType: "team_invitation",
        entityId: rows[0].id,
        details: { role: data.role },
      });
      return {
        id: rows[0].id,
        workshopId: membership.workshopId,
      };
    },
  );

  let createdInvitation;
  try {
    const client = await clerkClient();
    createdInvitation = await client.invitations.createInvitation({
      emailAddress: data.email,
      expiresInDays: 30,
      redirectUrl: "/convite",
      publicMetadata: {
        torqueInvitation: {
          id: invitation.id,
          workshopId: invitation.workshopId,
          role: data.role,
          email: data.email,
        },
      },
    });
  } catch (error) {
    await markInvitationFailed(request, invitation, error?.code).catch(() => {});
    throw new Error("Não foi possível enviar o convite. Confira o e-mail e tente novamente.");
  }

  try {
    await withAuthorizedWorkshopTransaction(
      request,
      { permission: "team:invite" },
      async (client, membership) => {
        const { rowCount } = await client.query(
          `UPDATE workshop_invitations
           SET status = 'pending', clerk_invitation_id = $3
           WHERE workshop_id = $1 AND id = $2 AND status = 'creating'`,
          [membership.workshopId, invitation.id, createdInvitation.id],
        );
        if (rowCount) {
          await writeAuditEvent(client, membership, {
            action: "team.invitation.sent",
            entityType: "team_invitation",
            entityId: invitation.id,
            details: { role: data.role },
          });
        }
      },
    );
  } catch {
    // The invitation is already sent. The acceptance flow can safely finish
    // a row left in `creating` using its server-created invitation metadata.
    console.error("Convite enviado; atualização do status ficou pendente.", {
      invitationId: invitation.id,
    });
  }

  return { email: data.email, role: data.role };
}

export async function getWorkshopTeam() {
  const request = getRequest();
  return withAuthorizedWorkshopTransaction(
    request,
    {
      permission: "team:read",
      rateLimit: { scope: "team-read", maximum: 120, windowSeconds: 60 },
    },
    async (client, membership) => {
      const [members, invitations] = await Promise.all([
        client.query(
          `SELECT auth_user_id, display_name, email, role, active, joined_at
           FROM workshop_memberships
           WHERE joined_at IS NOT NULL
           ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END, lower(display_name)`,
        ),
        client.query(
          `SELECT id, email, role, status, expires_at, created_at, invited_by_user_id
           FROM workshop_invitations
           ORDER BY created_at DESC
           LIMIT 100`,
        ),
      ]);
      return {
        members: members.rows.map((row) => ({
          userId: row.auth_user_id,
          name: row.display_name,
          email: row.email,
          role: row.role,
          active: row.active,
          joinedAt: row.joined_at,
        })),
        invitations: invitations.rows.map((row) => ({
          id: row.id,
          email: row.email,
          role: row.role,
          status: row.status,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
          canRevoke: membership.role === "owner" || row.invited_by_user_id === membership.userId,
        })),
      };
    },
  );
}

export async function revokeWorkshopInvitation(invitationId) {
  if (!uuidPattern.test(invitationId)) throw new Error("Convite inválido.");
  const request = getRequest();
  const invitation = await withAuthorizedWorkshopTransaction(
    request,
    {
      permission: "team:invite",
      rateLimit: { scope: "team-invitation-manage", maximum: 30, windowSeconds: 3600 },
    },
    async (client, membership) => {
      const { rows } = await client.query(
        `SELECT id, status, clerk_invitation_id, invited_by_user_id
         FROM workshop_invitations
         WHERE workshop_id = $1 AND id = $2
         LIMIT 1`,
        [membership.workshopId, invitationId],
      );
      const row = rows[0];
      if (!row || row.status !== "pending" || !row.clerk_invitation_id) {
        throw new Error("Este convite não está pendente.");
      }
      if (membership.role !== "owner" && row.invited_by_user_id !== membership.userId) {
        throw new Error("Gerentes só podem cancelar convites enviados por eles.");
      }
      await writeAuditEvent(client, membership, {
        action: "team.invitation.revoke_requested",
        entityType: "team_invitation",
        entityId: row.id,
        details: {},
      });
      return { id: row.id, clerkInvitationId: row.clerk_invitation_id };
    },
  );

  try {
    const client = await clerkClient();
    await client.invitations.revokeInvitation(invitation.clerkInvitationId);
  } catch (error) {
    await recordInvitationEvent(request, invitation, "team.invitation.revoke_failed", {
      provider: "clerk",
      ...(safeProviderCode(error?.code) ? { providerCode: safeProviderCode(error.code) } : {}),
    }).catch(() => {});
    throw new Error("O Clerk não conseguiu cancelar o convite. Tente novamente.");
  }

  await withAuthorizedWorkshopTransaction(
    request,
    { permission: "team:invite" },
    async (client, membership) => {
      const { rowCount } = await client.query(
        `UPDATE workshop_invitations
         SET status = 'revoked'
         WHERE workshop_id = $1 AND id = $2 AND status = 'pending'`,
        [membership.workshopId, invitation.id],
      );
      if (!rowCount) throw new Error("O convite mudou de estado; atualize a lista.");
      await writeAuditEvent(client, membership, {
        action: "team.invitation.revoked",
        entityType: "team_invitation",
        entityId: invitation.id,
        details: {},
      });
    },
  );
  return { ok: true };
}

export async function updateWorkshopMemberRole(userId, role) {
  if (typeof userId !== "string" || userId.length < 1 || userId.length > 255) {
    throw new Error("Membro inválido.");
  }
  if (!invitationRoles.has(role)) throw new Error("Perfil inválido.");
  const request = getRequest();
  return withAuthorizedWorkshopTransaction(
    request,
    {
      permission: "team:manage",
      rateLimit: { scope: "team-member-role-change", maximum: 20, windowSeconds: 3600 },
    },
    async (client, membership) => {
      if (userId === membership.userId) throw new Error("Você não pode alterar o próprio perfil.");
      const { rowCount } = await client.query(
        `UPDATE workshop_memberships
         SET role = $3, updated_at = now()
         WHERE workshop_id = $1 AND auth_user_id = $2
           AND joined_at IS NOT NULL AND role <> 'owner'`,
        [membership.workshopId, userId, role],
      );
      if (!rowCount)
        throw new Error("Membro não encontrado ou sem permissão para alterar o owner.");
      await writeAuditEvent(client, membership, {
        action: "team.member.role_changed",
        entityType: "workshop_member",
        entityId: userId,
        details: { role },
      });
      return { ok: true };
    },
  );
}

export async function deactivateWorkshopMember(userId) {
  if (typeof userId !== "string" || userId.length < 1 || userId.length > 255) {
    throw new Error("Membro inválido.");
  }
  const request = getRequest();
  return withAuthorizedWorkshopTransaction(
    request,
    {
      permission: "team:manage",
      rateLimit: { scope: "team-member-deactivate", maximum: 10, windowSeconds: 3600 },
    },
    async (client, membership) => {
      if (userId === membership.userId) throw new Error("Você não pode remover a própria conta.");
      const { rowCount } = await client.query(
        `UPDATE workshop_memberships
         SET active = false, updated_at = now()
         WHERE workshop_id = $1 AND auth_user_id = $2
           AND joined_at IS NOT NULL AND role <> 'owner' AND active = true`,
        [membership.workshopId, userId],
      );
      if (!rowCount)
        throw new Error("Membro não encontrado ou sem permissão para remover o owner.");
      await writeAuditEvent(client, membership, {
        action: "team.member.deactivated",
        entityType: "workshop_member",
        entityId: userId,
        details: {},
      });
      return { ok: true };
    },
  );
}

async function markInvitationFailed(request, invitation, providerCode) {
  return withAuthorizedWorkshopTransaction(
    request,
    { permission: "team:invite" },
    async (client, membership) => {
      const { rowCount } = await client.query(
        `UPDATE workshop_invitations
         SET status = 'failed'
         WHERE workshop_id = $1 AND id = $2 AND status = 'creating'`,
        [membership.workshopId, invitation.id],
      );
      if (rowCount) {
        await writeAuditEvent(client, membership, {
          action: "team.invitation.send_failed",
          entityType: "team_invitation",
          entityId: invitation.id,
          details: {
            provider: "clerk",
            ...(safeProviderCode(providerCode)
              ? { providerCode: safeProviderCode(providerCode) }
              : {}),
          },
        });
      }
    },
  );
}

async function recordInvitationEvent(request, invitation, action, details) {
  return withAuthorizedWorkshopTransaction(
    request,
    { permission: "team:invite" },
    (client, membership) =>
      writeAuditEvent(client, membership, {
        action,
        entityType: "team_invitation",
        entityId: invitation.id,
        details,
      }),
  );
}

function safeProviderCode(value) {
  return typeof value === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(value) ? value : undefined;
}

export async function acceptInvitationFromClerkUser(request, userId) {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const metadata = user.publicMetadata?.torqueInvitation;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;

  const { id, workshopId, role, email } = metadata;
  if (
    typeof id !== "string" ||
    !uuidPattern.test(id) ||
    typeof workshopId !== "string" ||
    !uuidPattern.test(workshopId) ||
    typeof role !== "string" ||
    !invitationRoles.has(role) ||
    typeof email !== "string"
  ) {
    return false;
  }

  const verifiedEmail = user.emailAddresses?.find(
    (address) =>
      address.emailAddress.trim().toLowerCase() === email.trim().toLowerCase() &&
      address.verification?.status === "verified",
  );
  if (!verifiedEmail) return false;

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || email;
  return withWorkshopTransaction(request, { workshopId, userId }, async (client) => {
    const inviteResult = await client.query(
      `SELECT email, role
       FROM workshop_invitations
       WHERE workshop_id = $1 AND id = $2
         AND lower(email) = $3 AND role = $4
         AND status IN ('creating', 'pending') AND expires_at > now()
       FOR UPDATE`,
      [workshopId, id, email.trim().toLowerCase(), role],
    );
    if (!inviteResult.rowCount) return false;

    await client.query(
      `INSERT INTO workshop_memberships
         (workshop_id, auth_user_id, display_name, email, role, active, invited_at, joined_at)
       VALUES ($1, $2, $3, $4, $5, true, now(), now())
       ON CONFLICT (workshop_id, auth_user_id) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           email = EXCLUDED.email,
           role = EXCLUDED.role,
           active = true,
           joined_at = now(),
           updated_at = now()`,
      [workshopId, userId, displayName, email.trim().toLowerCase(), role],
    );
    await client.query(
      `UPDATE workshop_invitations
       SET status = 'accepted', accepted_by_user_id = $3, accepted_at = now()
       WHERE workshop_id = $1 AND id = $2 AND status IN ('creating', 'pending')`,
      [workshopId, id, userId],
    );
    await writeAuditEvent(
      client,
      { workshopId, userId },
      {
        action: "team.invitation.accepted",
        entityType: "workshop_member",
        entityId: userId,
        details: { role },
      },
    );
    return true;
  });
}

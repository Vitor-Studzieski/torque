import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const invitationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.enum(["manager", "attendant", "mechanic", "finance"]),
});
const memberRoleSchema = z.object({
  userId: z.string().min(1).max(255),
  role: z.enum(["manager", "attendant", "mechanic", "finance"]),
});
const memberIdSchema = z.object({ userId: z.string().min(1).max(255) });
const invitationIdSchema = z.object({ id: z.string().uuid() });

export const inviteWorkshopMember = createServerFn({ method: "POST" })
  .validator((input) => invitationSchema.parse(input))
  .handler(async ({ data }) => {
    const { sendWorkshopInvitation } = await import("@/lib/server/invitations");
    return sendWorkshopInvitation(data);
  });

export const getWorkshopTeam = createServerFn({ method: "GET" }).handler(async () => {
  const { getWorkshopTeam: listTeam } = await import("@/lib/server/invitations");
  return listTeam();
});

export const revokeWorkshopInvitation = createServerFn({ method: "POST" })
  .validator((input) => invitationIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { revokeWorkshopInvitation: revoke } = await import("@/lib/server/invitations");
    return revoke(data.id);
  });

export const updateWorkshopMemberRole = createServerFn({ method: "POST" })
  .validator((input) => memberRoleSchema.parse(input))
  .handler(async ({ data }) => {
    const { updateWorkshopMemberRole: updateRole } = await import("@/lib/server/invitations");
    return updateRole(data.userId, data.role);
  });

export const deactivateWorkshopMember = createServerFn({ method: "POST" })
  .validator((input) => memberIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { deactivateWorkshopMember: deactivate } = await import("@/lib/server/invitations");
    return deactivate(data.userId);
  });

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@clerk/tanstack-react-start/server";
import { findActiveWorkshopMembership } from "@/lib/server/workshop-access";
import { acceptInvitationFromClerkUser } from "@/lib/server/invitations";
import { isClerkConfiguredForRuntime } from "@/lib/server/production-config";

export const getRequestAuth = createServerFn({ method: "GET" }).handler(async () => {
  if (!isClerkConfiguredForRuntime()) {
    return {
      mode: import.meta.env.DEV ? "demo" : "unconfigured",
      isAuthenticated: false,
      membershipStatus: "unconfigured",
      membership: null,
    };
  }

  const session = await auth();
  const isAuthenticated = Boolean(session.isAuthenticated && session.userId);
  if (!isAuthenticated) {
    return {
      mode: "clerk",
      isAuthenticated: false,
      membershipStatus: "unauthenticated",
      membership: null,
    };
  }

  try {
    const request = getRequest();
    let membership = await findActiveWorkshopMembership(request, session.userId);
    if (membership.status === "none") {
      const accepted = await acceptInvitationFromClerkUser(request, session.userId);
      if (accepted) membership = await findActiveWorkshopMembership(request, session.userId);
    }
    return {
      mode: "clerk",
      isAuthenticated: true,
      membershipStatus: membership.status,
      membership: membership.membership,
    };
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "UNKNOWN";
    console.error("Não foi possível confirmar o vínculo da oficina.", { code });
    return {
      mode: "clerk",
      isAuthenticated: true,
      membershipStatus: "database-unavailable",
      membership: null,
    };
  }
});

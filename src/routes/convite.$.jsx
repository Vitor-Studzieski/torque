import { createFileRoute } from "@tanstack/react-router";
import { InvitationSignUpPage } from "@/features/auth/pages/AuthPages";

export const Route = createFileRoute("/convite/$")({
  component: InvitationSignUpPage,
});

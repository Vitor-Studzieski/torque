import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "@/features/auth/pages/AuthPages";

export const Route = createFileRoute("/entrar/$")({
  component: SignInPage,
});

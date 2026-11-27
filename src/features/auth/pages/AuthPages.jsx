import { SignIn, SignUp } from "@clerk/tanstack-react-start";

const hasPublishableKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function AuthShell({ children }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

function AuthNotConfigured() {
  return (
    <AuthShell>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Torque</p>
        <h1 className="mt-3 text-xl font-bold">Autenticação ainda não configurada</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Configure a chave pública do Clerk no ambiente local para testar a entrada. A demonstração
          local continua disponível durante o desenvolvimento.
        </p>
        {import.meta.env.DEV && (
          <a
            href="/"
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Voltar à demonstração
          </a>
        )}
      </section>
    </AuthShell>
  );
}

export function SignInPage() {
  if (!hasPublishableKey) return <AuthNotConfigured />;

  return (
    <AuthShell>
      <SignIn routing="path" path="/entrar" signUpUrl="/convite" />
    </AuthShell>
  );
}

export function InvitationSignUpPage() {
  if (!hasPublishableKey) return <AuthNotConfigured />;

  return (
    <AuthShell>
      <SignUp routing="path" path="/convite" signInUrl="/entrar" />
    </AuthShell>
  );
}

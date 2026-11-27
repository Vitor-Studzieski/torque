export function isClerkConfiguredForRuntime() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!publishableKey || !secretKey) return false;

  if (import.meta.env.PROD) {
    return publishableKey.startsWith("pk_live_") && secretKey.startsWith("sk_live_");
  }
  return true;
}

// Shareable browse-only menu URL — implemented in Step 12
// See docs/customer.md § Shareable Menu URL
// URL pattern: https://menu.fbqr.app/{restaurantId}/menu

export default function ShareableMenuPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  void params; // Used in Step 12
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <p className="text-muted-foreground text-center">
        Shareable menu — Step 12
      </p>
    </main>
  );
}

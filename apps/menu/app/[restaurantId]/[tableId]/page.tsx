// QR-validated table menu — implemented in Step 12
// See docs/customer.md § QR Validation Flow

export default function TableMenuPage({
  params,
}: {
  params: Promise<{ restaurantId: string; tableId: string }>;
}) {
  void params; // Used in Step 12
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <p className="text-muted-foreground text-center">
        Menu — Step 12
      </p>
    </main>
  );
}

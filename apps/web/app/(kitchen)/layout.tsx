// Kitchen display layout — dark theme applied via Tailwind dark class
// PIN auth guard added in Step 3
export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dark">{children}</div>;
}

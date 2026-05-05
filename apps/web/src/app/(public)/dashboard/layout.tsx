export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dashboard pages use the parent layout (PublicLayout) which already has header/footer
  return <>{children}</>;
}


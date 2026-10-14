import type { Metadata } from "next";
import { AdminAuthProvider } from "@/lib/admin/auth";
import { AdminStoreProvider } from "@/lib/admin/store";

export const metadata: Metadata = {
  title: "Backoffice — musclePro",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-ink-50/40 text-ink-900">
      <AdminAuthProvider>
        <AdminStoreProvider>{children}</AdminStoreProvider>
      </AdminAuthProvider>
    </div>
  );
}

import type { ReactNode } from "react";
import { PlataformaShell } from "@/components/plataforma/PlataformaShell";
import { ToastProvider } from "@/components/plataforma/Toast";
import { AccountSessionProvider } from "@/lib/plataforma/session";
import { PlataformaStoreProvider } from "@/lib/plataforma/store";

export default function PlataformaLayout({ children }: { children: ReactNode }) {
  return (
    <AccountSessionProvider>
      <PlataformaStoreProvider>
        <ToastProvider>
          <PlataformaShell>{children}</PlataformaShell>
        </ToastProvider>
      </PlataformaStoreProvider>
    </AccountSessionProvider>
  );
}

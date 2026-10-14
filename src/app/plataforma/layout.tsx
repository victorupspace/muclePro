import type { ReactNode } from "react";
import { PlataformaShell } from "@/components/plataforma/PlataformaShell";
import { ConsultorSessionProvider } from "@/lib/plataforma/session";
import { PlataformaStoreProvider } from "@/lib/plataforma/store";

export default function PlataformaLayout({ children }: { children: ReactNode }) {
  return (
    <ConsultorSessionProvider>
      <PlataformaStoreProvider>
        <PlataformaShell>{children}</PlataformaShell>
      </PlataformaStoreProvider>
    </ConsultorSessionProvider>
  );
}

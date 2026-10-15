import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/plataforma/Toast";

export const metadata: Metadata = {
  title: "Meu treino",
  description: "Área do aluno: treino do dia, ficha, evolução e mensalidades.",
  manifest: "/app.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Meu treino", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/app-icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#01215C",
};

export default function StudentAppLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-svh bg-surface">{children}</div>
    </ToastProvider>
  );
}

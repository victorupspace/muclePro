import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "musclePro — Gestão para academias e negócios de atividade física",
  description:
    "Sistema de gestão (CRM) para academias, estúdios, escolas de natação, boxes de crossfit e academias de lutas. Alunos, planos, equipe com permissões e inadimplência em um só lugar.",
  keywords: [
    "sistema para academia",
    "crm para academia",
    "gestão de academia",
    "controle de inadimplência academia",
    "software para escola de natação",
    "gestão box crossfit",
    "musclePro",
  ],
  authors: [{ name: "musclePro" }],
  openGraph: {
    title: "musclePro — Gestão para academias e negócios de atividade física",
    description:
      "Alunos, equipe e financeiro sob controle. O sistema de gestão para quem opera um estabelecimento de atividade física.",
    type: "website",
    locale: "pt_BR",
    siteName: "musclePro",
  },
  twitter: {
    card: "summary_large_image",
    title: "musclePro — Gestão para academias e negócios de atividade física",
    description:
      "Alunos, equipe e financeiro sob controle. O sistema de gestão para quem opera um estabelecimento de atividade física.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/assets/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/assets/favicon.svg",
    apple: "/assets/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}

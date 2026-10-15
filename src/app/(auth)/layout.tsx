import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acesso — musclePro",
  description:
    "Crie a conta do seu estabelecimento ou acesse o musclePro, o sistema de gestão para academias, estúdios, escolas de natação, boxes e academias de lutas.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-white text-ink-900">{children}</div>;
}

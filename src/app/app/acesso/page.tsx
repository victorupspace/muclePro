"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/app/BrandMark";
import { EASE } from "@/lib/motion";
import { supabase } from "@/lib/supabase/client";

type Info = { firstName: string; companyName: string; verify: "nascimento" | "whatsapp" };

export default function AcessoPage() {
  return (
    <Suspense fallback={null}>
      <Acesso />
    </Suspense>
  );
}

// Primeiro acesso pelo link do WhatsApp: confirma um dado e abre a sessão.
function Acesso() {
  const router = useRouter();
  const token = useSearchParams().get("t") ?? "";
  const [info, setInfo] = useState<Info | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setFatal("Link incompleto. Abra o link que a academia enviou pelo WhatsApp.");
      return;
    }
    void fetch(`/api/app/acesso?t=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Partial<Info> & { error?: string };
        if (!res.ok || !body.firstName) setFatal(body.error ?? "Este link não vale mais. Peça um novo para a academia.");
        else setInfo(body as Info);
      })
      .catch(() => setFatal("Sem conexão. Verifique a internet e abra o link de novo."));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/app/acesso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, answer }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { tokenHash?: string; error?: string } | undefined;
    if (!res || !res.ok || !body?.tokenHash) {
      setBusy(false);
      if (res?.status === 401 && body?.error?.includes("tentativa")) setError(body.error);
      else if (body?.error) setFatal(body.error);
      else setError("Não deu certo agora. Tente de novo.");
      return;
    }
    // Uma sessão de equipe aberta neste navegador não pode se misturar com a do aluno.
    await supabase.auth.signOut().catch(() => null);
    const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: body.tokenHash, type: "email" });
    if (otpError) {
      setBusy(false);
      setFatal("Não foi possível entrar. Peça um novo link para a academia.");
      return;
    }
    router.replace("/app");
  }

  return (
    <main className="flex min-h-svh flex-col bg-brand px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(40px,env(safe-area-inset-top))] text-white">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
        <BrandMark className="h-10 w-12" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-10 flex-1"
        >
          {fatal ? (
            <>
              <h1 className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em]">Este link não funciona mais</h1>
              <p className="mt-3 text-[15px] leading-[1.55] text-white/75">{fatal}</p>
              <p className="mt-6 rounded-card bg-white/10 px-4 py-3 text-[13.5px] leading-[1.5] text-white/85">
                Peça para a recepção ou para o seu professor enviar um novo link de acesso.
              </p>
            </>
          ) : !info ? (
            <div className="flex items-center gap-2 text-white/75">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
              Abrindo seu acesso…
            </div>
          ) : (
            <>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-light">{info.companyName}</p>
              <h1 className="mt-2 text-[28px] font-bold leading-[1.12] tracking-[-0.02em]">Oi, {info.firstName}! Seu treino agora fica no celular.</h1>
              <p className="mt-3 text-[15px] leading-[1.55] text-white/75">
                Para proteger seus dados, confirme {info.verify === "nascimento" ? "sua data de nascimento" : "os 4 últimos números do seu WhatsApp"}.
              </p>
              <form onSubmit={submit} className="mt-8 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.12em] text-white/70">
                    {info.verify === "nascimento" ? "Data de nascimento" : "4 últimos números do WhatsApp"}
                  </span>
                  {info.verify === "nascimento" ? (
                    <input
                      type="date"
                      required
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="h-14 w-full rounded-card border-0 bg-white px-4 text-[17px] font-semibold text-ink-900 outline-none ring-2 ring-transparent focus:ring-brand-light"
                    />
                  ) : (
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      required
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="0000"
                      className="h-14 w-full rounded-card border-0 bg-white px-4 text-center text-[24px] font-bold tracking-[0.4em] text-ink-900 outline-none ring-2 ring-transparent focus:ring-brand-light"
                    />
                  )}
                </label>
                {error && (
                  <p role="alert" className="rounded-btn bg-danger-500/20 px-3 py-2 text-[13px] font-semibold text-white">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy || !answer}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-card bg-white text-[16px] font-bold text-brand transition-opacity disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.4} /> : null}
                  {busy ? "Entrando..." : "Entrar"}
                  {!busy && <ArrowRight className="h-5 w-5" strokeWidth={2.4} />}
                </button>
              </form>
            </>
          )}
        </motion.div>
        <p className="mt-8 flex items-center gap-1.5 text-[11.5px] text-white/55">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
          Acesso pessoal. Só você vê seu treino, sua evolução e suas mensalidades.
        </p>
      </div>
    </main>
  );
}

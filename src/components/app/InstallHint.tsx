"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void> };

const DISMISS_KEY = "musclepro:app-install-dismissed";

// Convite para "Adicionar à tela inicial". No Android usa o pedido do
// navegador; no iPhone explica o caminho pelo botão Compartilhar.
export function InstallHint() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (dismissed || standalone) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) setMode("ios");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* navegador sem armazenamento: só esconde nesta visita */
    }
    setMode(null);
  }

  if (!mode) return null;
  return (
    <div className="relative mb-3 flex items-start gap-3 rounded-card border border-brand/20 bg-white p-3.5 shadow-[0_10px_30px_-18px_rgba(1,33,92,0.5)]">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        {mode === "ios" ? <Share className="h-4 w-4" strokeWidth={2.4} /> : <Download className="h-4 w-4" strokeWidth={2.4} />}
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-[14px] font-bold text-ink-900">Abra como um app</p>
        {mode === "ios" ? (
          <p className="mt-0.5 text-[13px] leading-[1.5] text-ink-600">
            Toque em <span className="font-semibold">Compartilhar</span> e depois em <span className="font-semibold">Adicionar à Tela de Início</span>.
          </p>
        ) : (
          <>
            <p className="mt-0.5 text-[13px] leading-[1.5] text-ink-600">Coloque o seu treino na tela inicial do celular.</p>
            <button
              type="button"
              onClick={() => void event?.prompt().then(dismiss)}
              className="mt-2 h-10 rounded-btn bg-brand px-4 text-[13.5px] font-bold text-white"
            >
              Adicionar à tela inicial
            </button>
          </>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Dispensar" className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-400">
        <X className="h-4 w-4" strokeWidth={2.4} />
      </button>
    </div>
  );
}

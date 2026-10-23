"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Mail, Send } from "lucide-react";
import { Field, inputClass, textareaClass } from "@/components/plataforma/FormKit";
import { PageIntro } from "@/components/plataforma/motion";
import { isValidEmail } from "@/lib/cadastro/masks";
import { cn } from "@/lib/cn";
import { useAccountSession } from "@/lib/plataforma/session";
import { supabase } from "@/lib/supabase/client";

const MAX_MESSAGE = 750;

// Fale conosco: a academia manda uma mensagem para a equipe musclePro.
export default function FaleConoscoPage() {
  const { profile } = useAccountSession();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Nome e e-mail já vêm do cadastro; dá para trocar.
  useEffect(() => {
    if (!profile) return;
    setName((v) => v || profile.fullName || "");
    setEmail((v) => v || profile.email || "");
  }, [profile]);

  const errors = {
    name: name.trim().length < 2 ? "Informe seu nome." : null,
    subject: subject.trim().length < 3 ? "Informe o assunto." : null,
    email: !isValidEmail(email) ? "Informe um e-mail válido para a resposta." : null,
    message: message.trim().length < 10 ? "Escreva sua mensagem (pelo menos 10 caracteres)." : null,
  };
  const hasError = Object.values(errors).some(Boolean);
  const left = MAX_MESSAGE - message.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (hasError || !profile) return;
    setSending(true);
    setError(null);
    const { data } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("support_messages").insert({
      account_id: profile.id,
      sender_user_id: data.user?.id,
      name: name.trim(),
      subject: subject.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    setSending(false);
    if (insertError) {
      setError("Não foi possível enviar agora. Tente de novo em instantes.");
      return;
    }
    setSentTo(email.trim());
    setSubject("");
    setMessage("");
    setTouched(false);
  }

  return (
    <div className="space-y-6">
      <PageIntro eyebrow="Fale conosco" title="Como podemos ajudar?" description="Dúvidas, sugestões ou algo que não funcionou. A equipe musclePro responde no e-mail que você indicar." />

      <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-card border border-ink-200 bg-white p-5 md:p-6">
          {sentTo ? (
            <div className="flex flex-col items-center px-2 py-10 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600">
                <CheckCircle2 className="h-6 w-6" strokeWidth={2.2} />
              </span>
              <p className="mt-4 text-[17px] font-bold text-ink-900">Mensagem enviada</p>
              <p className="mt-1.5 max-w-sm text-[13.5px] leading-[1.6] text-ink-600">
                Recebemos seu contato. A resposta chega em <span className="font-semibold text-ink-900">{sentTo}</span>, em até 1 dia útil.
              </p>
              <button
                type="button"
                onClick={() => setSentTo(null)}
                className="mt-6 inline-flex h-10 items-center rounded-btn border border-ink-200 bg-white px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400"
              >
                Enviar outra mensagem
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Field label="Seu nome" required>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 120))}
                      placeholder="Maria Souza"
                      autoComplete="name"
                      className={cn(inputClass, touched && errors.name && "border-danger-300")}
                    />
                  </Field>
                  {touched && errors.name && <FieldError>{errors.name}</FieldError>}
                </div>
                <div>
                  <Field label="E-mail para a resposta" required>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.slice(0, 160))}
                      placeholder="voce@suaacademia.com.br"
                      autoComplete="email"
                      className={cn(inputClass, touched && errors.email && "border-danger-300")}
                    />
                  </Field>
                  {touched && errors.email && <FieldError>{errors.email}</FieldError>}
                </div>
              </div>

              <div>
                <Field label="Assunto" required>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value.slice(0, 150))}
                    placeholder="Ex.: Dúvida sobre o app do aluno"
                    className={cn(inputClass, touched && errors.subject && "border-danger-300")}
                  />
                </Field>
                {touched && errors.subject && <FieldError>{errors.subject}</FieldError>}
              </div>

              <div>
                <Field label="Mensagem" required>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                    maxLength={MAX_MESSAGE}
                    rows={7}
                    placeholder="Conte com detalhes: o que você tentou fazer, em qual tela e o que aconteceu."
                    className={cn(textareaClass, touched && errors.message && "border-danger-300")}
                  />
                </Field>
                <div className="mt-1 flex items-start justify-between gap-3">
                  {touched && errors.message ? <FieldError>{errors.message}</FieldError> : <span />}
                  <span
                    aria-live="polite"
                    className={cn("shrink-0 text-[11.5px] tabular-nums", left <= 50 ? "font-semibold text-warning-800" : "text-ink-500")}
                  >
                    {message.length}/{MAX_MESSAGE}
                  </span>
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-btn bg-danger-50 px-3 py-2 text-[12.5px] font-semibold text-danger-700 ring-1 ring-inset ring-danger-200">
                  {error}
                </p>
              )}

              <div className="flex justify-end border-t border-ink-100 pt-4">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60 sm:w-auto"
                >
                  <Send className="h-3.5 w-3.5" strokeWidth={2.4} />
                  {sending ? "Enviando..." : "Enviar mensagem"}
                </button>
              </div>
            </form>
          )}
        </section>

        <aside className="space-y-4">
          <InfoCard icon={<Clock className="h-4 w-4" strokeWidth={2.2} />} title="Tempo de resposta">
            Respondemos em até 1 dia útil, de segunda a sexta, das 9h às 18h.
          </InfoCard>
          <InfoCard icon={<Mail className="h-4 w-4" strokeWidth={2.2} />} title="Para agilizar">
            Diga em qual tela aconteceu e, se puder, o nome do aluno ou funcionário envolvido. Não envie senhas.
          </InfoCard>
        </aside>
      </div>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-1 text-[11.5px] font-semibold text-danger-600">
      {children}
    </p>
  );
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-ink-200 bg-white p-5">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">{icon}</span>
        <p className="text-[14px] font-bold text-ink-900">{title}</p>
      </div>
      <p className="mt-2.5 text-[13px] leading-[1.6] text-ink-600">{children}</p>
    </section>
  );
}

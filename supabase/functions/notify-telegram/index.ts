type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
};

const TELEGRAM_API = "https://api.telegram.org";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("NOTIFICATION_WEBHOOK_SECRET");
  const receivedSecret = req.headers.get("x-musclepro-webhook-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    return json({ error: "Missing Telegram configuration" }, 500);
  }

  const payload = (await req.json()) as WebhookPayload;

  if (payload.type !== "INSERT" || !payload.record) {
    return json({ ok: true, skipped: "not_insert" });
  }

  const message = buildMessage(payload.table, payload.record);
  if (!message) {
    return json({ ok: true, skipped: "not_notifiable" });
  }

  const telegramResponse = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });

  const telegramBody = await telegramResponse.json().catch(() => null);

  if (!telegramResponse.ok) {
    return json(
      {
        error: "Telegram request failed",
        details: telegramBody,
      },
      502,
    );
  }

  return json({ ok: true });
});

function buildMessage(table: string, record: Record<string, unknown>) {
  // Lead do formulário da home (hero_form_submissions)
  if (table === "hero_form_submissions") {
    return [
      "Novo lead da landing",
      "",
      field("Nome", text(record.full_name)),
      field("Telefone", text(record.phone)),
      field("E-mail", text(record.email)),
      field("Tipo de estabelecimento", businessTypeLabel(text(record.business_type))),
      field("Unidades", unitsRangeLabel(text(record.units_range))),
      field("Alunos ativos", studentsRangeLabel(text(record.active_students_range))),
      backofficeLine("/internal-musclepro-admin/leads-landing"),
    ]
      .filter(Boolean)
      .join("\n");
  }

  // Cadastro de estabelecimento pela tela /cadastro (accounts)
  if (table === "accounts") {
    return [
      "Novo cadastro aguardando aprovação",
      "",
      field("Estabelecimento", text(record.company_name)),
      field("Tipo", businessTypeLabel(text(record.business_type))),
      field("Responsável", text(record.full_name)),
      field("Telefone", text(record.phone)),
      field("E-mail", text(record.email)),
      field(documentLabel(text(record.document_type)), text(record.document)),
      backofficeLine("/internal-musclepro-admin/contas-novas"),
    ]
      .filter(Boolean)
      .join("\n");
  }

  return null;
}

function field(label: string, value: string | null) {
  if (!value) return null;
  return `${label}: ${value}`;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function businessTypeLabel(value: string | null) {
  const labels: Record<string, string> = {
    academia: "Academia de musculação",
    estudio: "Estúdio (funcional, pilates, yoga)",
    natacao: "Escola de natação",
    crossfit: "Box de crossfit",
    lutas: "Academia de lutas ou jiu-jitsu",
    outro: "Outro negócio de saúde",
  };
  return value ? labels[value] ?? value : null;
}

function unitsRangeLabel(value: string | null) {
  const labels: Record<string, string> = {
    "1": "1 unidade",
    "2-5": "2 a 5",
    "6+": "6 ou mais",
  };
  return value ? labels[value] ?? value : null;
}

function studentsRangeLabel(value: string | null) {
  const labels: Record<string, string> = {
    "ate-100": "Até 100",
    "100-300": "100 a 300",
    "300-1000": "300 a 1.000",
    "1000+": "Mais de 1.000",
  };
  return value ? labels[value] ?? value : null;
}

function documentLabel(value: string | null) {
  if (value === "cpf") return "CPF";
  if (value === "cnpj") return "CNPJ";
  return "Documento";
}

function backofficeLine(path: string) {
  const baseUrl = Deno.env.get("BACKOFFICE_URL");
  return baseUrl ? `Abrir: ${baseUrl.replace(/\/$/, "")}${path}` : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

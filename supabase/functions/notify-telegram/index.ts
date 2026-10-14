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
  if (table === "hero_form_submissions") {
    return [
      "Novo lead da landing",
      "",
      field("Perfil", clientTypeLabel(text(record.client_type))),
      field("Nome", text(record.full_name)),
      field("Telefone", text(record.phone)),
      field("Email", text(record.email)),
      field("Regioes", arrayText(record.regions)),
      field("Rede de parceiros", booleanLabel(record.has_partner_network)),
      field("Porte", text(record.commercializer_size)),
      field("Segmento", text(record.segment)),
      field("Gasto mensal", text(record.monthly_energy_spend)),
      backofficeLine("/internal-musclepro-admin/leads-landing"),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (table === "accounts") {
    return [
      "Novo cadastro aguardando aprovacao",
      "",
      field("Tipo", accountKindLabel(text(record.kind))),
      field("Nome", text(record.full_name)),
      field("Telefone", text(record.phone)),
      field("Email", text(record.email)),
      field("Documento", text(record.document)),
      field("Empresa", text(record.company_name)),
      backofficeLine("/internal-musclepro-admin/contas-novas"),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (table === "commercializer_leads") {
    if (text(record.source) === "landing") {
      return null;
    }

    return [
      "Nova comercializadora",
      "",
      field("Nome", text(record.full_name)),
      field("Telefone", text(record.phone)),
      field("Email", text(record.email)),
      field("Origem", sourceLabel(text(record.source))),
      backofficeLine("/internal-musclepro-admin/comercializadoras"),
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

function arrayText(value: unknown) {
  return Array.isArray(value) && value.length > 0
    ? value.map((item) => String(item)).join(", ")
    : null;
}

function booleanLabel(value: unknown) {
  if (value === true) return "sim";
  if (value === false) return "nao";
  return null;
}

function clientTypeLabel(value: string | null) {
  const labels: Record<string, string> = {
    consultor: "Consultor",
    comercializadora: "Comercializadora",
    consumidor: "Consumidor final",
  };
  return value ? labels[value] ?? value : null;
}

function accountKindLabel(value: string | null) {
  const labels: Record<string, string> = {
    consultor: "Consultor",
    comercializadora: "Comercializadora",
  };
  return value ? labels[value] ?? value : null;
}

function sourceLabel(value: string | null) {
  const labels: Record<string, string> = {
    cadastro: "Cadastro completo",
    landing: "Landing page",
  };
  return value ? labels[value] ?? value : null;
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

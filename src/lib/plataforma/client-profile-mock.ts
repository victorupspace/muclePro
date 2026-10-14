import type {
  Client,
  ClientActivity,
  ClientDocument,
  ClientLifecycleStatus,
  ClientMigrationStep,
  ClientMigrationStage,
  ClientMigrationStatus,
  ClientProfile,
  ClientProfileTag,
  ClientUnit,
  Proposal,
  Submercado,
  Task,
  Tensao,
} from "./types";
import { getSubmercadoForState } from "./distributors";
import { CLIENT_MIGRATION_STAGES } from "./format";

function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(seed: number, list: readonly T[]): T {
  return list[seed % list.length];
}

const SUBMERCADOS: Submercado[] = ["SE/CO", "S", "NE", "N"];
const TENSOES: Tensao[] = ["BT", "MT", "AT"];
const TARIFFS = ["Verde A4", "Azul A4", "Verde A3", "Azul A3"];
const UC_PRESETS: Record<string, number> = {
  ativo: 2,
  migrando: 2,
  assinado: 2,
  em_negociacao: 1,
  proposta_enviada: 1,
  qualificando: 1,
  novo: 1,
  inativo: 1,
};

function lifecycleFor(client: Client): ClientLifecycleStatus {
  return client.status;
}

function migrationFor(lifecycle: ClientLifecycleStatus): Record<ClientMigrationStage, ClientMigrationStatus> {
  const completedCount =
    lifecycle === "ativo"
      ? CLIENT_MIGRATION_STAGES.length
      : lifecycle === "migrando"
        ? 5
        : lifecycle === "assinado"
          ? 4
          : lifecycle === "em_negociacao"
            ? 3
            : lifecycle === "proposta_enviada"
              ? 2
              : lifecycle === "qualificando"
                ? 1
                : 0;
  return CLIENT_MIGRATION_STAGES.reduce<Record<ClientMigrationStage, ClientMigrationStatus>>((acc, stage, i) => {
    if (i < completedCount) acc[stage] = "concluido";
    else if (i === completedCount && lifecycle !== "novo" && lifecycle !== "inativo")
      acc[stage] = "em_andamento";
    else acc[stage] = "pendente";
    return acc;
  }, {} as Record<ClientMigrationStage, ClientMigrationStatus>);
}

function buildMigrationSteps(client: Client, migration: Record<ClientMigrationStage, ClientMigrationStatus>): ClientMigrationStep[] {
  const baseTime = new Date(client.createdAt).getTime();

  return CLIENT_MIGRATION_STAGES.map((stage, i) => {
    const status = migration[stage];
    const updatedAt = new Date(baseTime + Math.max(1, i + 1) * 3 * 86_400_000).toISOString();
    return {
      id: `${client.id}-migration-${stage}`,
      clientId: client.id,
      stepName: stage,
      status,
      completedAt: status === "concluido" ? updatedAt : undefined,
      updatedAt,
      documents: [],
    };
  });
}

function profileTagFor(segment?: string): ClientProfileTag | undefined {
  const value = segment?.toLocaleLowerCase("pt-BR") ?? "";
  if (!value) return undefined;
  if (value.includes("atacad")) return "atacadista";
  if (value.includes("varej") || value.includes("varejo")) return "varejista";
  if (value.includes("ind")) return "industria";
  if (value.includes("serv")) return "servicos";
  if (value.includes("log")) return "logistica";
  return "outros";
}

function buildUnits(client: Client): ClientUnit[] {
  const seed = hash(client.id);
  const count = UC_PRESETS[client.status] ?? 1;
  const units: ClientUnit[] = [];
  for (let i = 0; i < count; i++) {
    const localSeed = seed + i * 17;
    units.push({
      id: `${client.id}-uc${i + 1}`,
      clientId: client.id,
      ucCode: `UC ${String(localSeed).padStart(7, "0").slice(0, 7)}`,
      distribuidora: client.distributor ?? "Distribuidora não definida",
      locationState: client.locationState,
      locationCity: client.locationCity,
      submercado: getSubmercadoForState(client.locationState) ?? pick(localSeed >> 2, SUBMERCADOS),
      tensao: pick(localSeed >> 3, TENSOES),
      contractedDemandKw: 250 + (localSeed % 750),
      tariff: pick(localSeed >> 4, TARIFFS),
      averageConsumptionKwh: 32_000 + (localSeed % 180_000),
      smfReady: client.status === "ativo" || (localSeed & 1) === 0,
      contractEndAt: client.status === "ativo"
        ? new Date(Date.now() + (180 + (localSeed % 540)) * 86_400_000).toISOString()
        : undefined,
    });
  }
  return units;
}

function buildDocuments(client: Client): ClientDocument[] {
  const seed = hash(client.id);
  const baseTime = new Date(client.createdAt).getTime();
  const types: ClientDocument["kind"][] = [
    "contrato_social",
    "fatura",
    "procuracao",
    "denuncia_distribuidora",
    "ccee",
  ];
  const count = client.status === "ativo" ? 5 : ["migrando", "em_negociacao"].includes(client.status) ? 3 : 1;
  return types.slice(0, count).map((kind, i) => ({
    id: `${client.id}-doc${i + 1}`,
    clientId: client.id,
    name: `${kind.replace(/_/g, "-")}-${String(seed).slice(-4)}.pdf`,
    kind,
    uploadedAt: new Date(baseTime + i * 4 * 86_400_000).toISOString(),
    expiresAt:
      kind === "procuracao" || kind === "denuncia_distribuidora"
        ? new Date(baseTime + (i + 6) * 30 * 86_400_000).toISOString()
        : undefined,
    sizeKb: 120 + ((seed + i * 31) % 4_000),
  }));
}

function buildActivities(client: Client, tasks: Task[], proposals: Proposal[]): ClientActivity[] {
  const out: ClientActivity[] = [];
  const baseBy = "Você";

  out.push({
    id: `${client.id}-act-create`,
    clientId: client.id,
    kind: "criacao",
    by: baseBy,
    at: client.createdAt,
    title: "Cliente cadastrado",
    body: client.companyName ?? client.name,
  });

  proposals
    .filter((p) => p.clientId === client.id)
    .forEach((p) => {
      out.push({
        id: `${client.id}-act-proposal-${p.id}`,
        clientId: client.id,
        kind: "proposta",
        by: baseBy,
        at: p.sentAt ?? p.createdAt,
        title: `Proposta ${p.status === "rascunho" ? "criada" : p.status}`,
        body: p.title,
      });
    });

  tasks
    .filter((t) => t.clientId === client.id)
    .forEach((t) => {
      out.push({
        id: `${client.id}-act-task-${t.id}`,
        clientId: client.id,
        kind: "tarefa",
        by: baseBy,
        at: t.createdAt,
        title: t.done ? "Tarefa concluída" : "Tarefa criada",
        body: t.title,
      });
    });

  if (client.status === "ativo") {
    const baseTime = new Date(client.createdAt).getTime();
    out.push({
      id: `${client.id}-act-status-ativo`,
      clientId: client.id,
      kind: "status",
      by: baseBy,
      at: new Date(baseTime + 30 * 86_400_000).toISOString(),
      title: "Status atualizado para Ativo",
    });
  }

  return out.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

export function buildClientProfile(client: Client, tasks: Task[], proposals: Proposal[]): ClientProfile {
  const units = buildUnits(client);
  const lifecycle = lifecycleFor(client);
  const migration = migrationFor(lifecycle);
  const migrationSteps = buildMigrationSteps(client, migration);
  const totalKwh = units.reduce((acc, u) => acc + (u.averageConsumptionKwh ?? 0), 0);
  const lastInteraction = [
    ...tasks.filter((t) => t.clientId === client.id).map((t) => t.createdAt),
    ...proposals.filter((p) => p.clientId === client.id).map((p) => p.sentAt ?? p.createdAt),
    client.createdAt,
  ]
    .sort((a, b) => +new Date(b) - +new Date(a))[0];

  return {
    id: client.id,
    legalName: client.companyName ?? client.name,
    tradeName: client.companyName ? client.name : undefined,
    document: undefined,
    profileTag: profileTagFor(client.segment),
    lifecycle,
    economicGroup: client.companyName,
    units,
    documents: buildDocuments(client),
    activities: buildActivities(client, tasks, proposals),
    migration,
    migrationSteps,
    lastInteractionAt: lastInteraction,
    averageConsumptionKwh: totalKwh || undefined,
    monthlySavings: client.monthlySavings,
  };
}

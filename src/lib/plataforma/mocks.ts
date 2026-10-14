import type { Client, Notification, Proposal, Subscription, Task } from "./types";

const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const hours = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();
const ahead = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export function buildMockSubscription(): Subscription {
  return {
    status: "ativo",
    plan: "musclePro",
    nextDueAt: ahead(18),
  };
}

export function buildMockClients(ownerId: string): Client[] {
  return [
    {
      id: "c1",
      ownerId,
      name: "Lúcia Albuquerque",
      companyName: "Albuquerque Indústria Têxtil",
      email: "lucia@albuquerquetextil.com.br",
      phone: "(11) 98421-3300",
      segment: "Indústria",
      monthlySavings: 14_320,
      status: "ativo",
      createdAt: days(45),
    },
    {
      id: "c2",
      ownerId,
      name: "Marco Tavares",
      companyName: "Tavares Logística",
      email: "marco@tavareslog.com",
      phone: "(21) 99182-7710",
      segment: "Logística",
      monthlySavings: 9_870,
      status: "ativo",
      createdAt: days(60),
    },
    {
      id: "c3",
      ownerId,
      name: "Renata Pires",
      companyName: "RP Supermercados",
      email: "renata@rpsuper.com.br",
      phone: "(31) 99811-4422",
      segment: "Varejista",
      monthlySavings: 22_410,
      status: "ativo",
      createdAt: days(80),
    },
    {
      id: "c4",
      ownerId,
      name: "Carlos Henrique",
      companyName: "Hospital São Lucas",
      email: "ch@hsl.com.br",
      phone: "(41) 99700-2244",
      segment: "Saúde",
      monthlySavings: 31_260,
      status: "ativo",
      createdAt: days(120),
    },
    {
      id: "c5",
      ownerId,
      name: "Beatriz Soares",
      companyName: "Soares Engenharia",
      email: "bia@soaresengenharia.com",
      phone: "(11) 99423-9981",
      segment: "Engenharia",
      monthlySavings: 7_920,
      status: "migrando",
      createdAt: days(20),
    },
    {
      id: "c6",
      ownerId,
      name: "Eduardo Lima",
      companyName: "Lima Café",
      email: "edu@limacafe.com.br",
      phone: "(35) 99812-5566",
      segment: "Indústria",
      monthlySavings: 6_410,
      status: "ativo",
      createdAt: days(8),
    },
    {
      id: "c7",
      ownerId,
      name: "Patrícia Mendonça",
      companyName: "Mendonça Materiais",
      email: "patricia@mendoncamateriais.com",
      phone: "(19) 99411-3372",
      segment: "Construção",
      status: "em_negociacao",
      createdAt: days(4),
    },
    {
      id: "c8",
      ownerId,
      name: "Felipe Andrade",
      companyName: "Andrade Distribuidora",
      email: "felipe@andradedist.com.br",
      phone: "(11) 99220-8800",
      segment: "Atacadista",
      status: "qualificando",
      createdAt: days(2),
    },
  ];
}

export function buildMockTasks(ownerId: string, clients: Client[]): Task[] {
  return [
    {
      id: "t1",
      ownerId,
      title: "Ligar para Patrícia (Mendonça Materiais)",
      description: "Retornar contato sobre proposta de média tensão.",
      dueAt: ahead(0),
      clientId: clients[6]?.id,
      priority: "alta",
      done: false,
      createdAt: hours(6),
    },
    {
      id: "t2",
      ownerId,
      title: "Enviar simulação para Felipe Andrade",
      dueAt: ahead(1),
      clientId: clients[7]?.id,
      priority: "alta",
      done: false,
      createdAt: hours(20),
    },
    {
      id: "t3",
      ownerId,
      title: "Revisar fatura do Hospital São Lucas",
      dueAt: ahead(2),
      clientId: clients[3]?.id,
      priority: "media",
      done: false,
      createdAt: days(1),
    },
    {
      id: "t4",
      ownerId,
      title: "Renovar contrato Tavares Logística",
      dueAt: ahead(7),
      clientId: clients[1]?.id,
      priority: "media",
      done: false,
      createdAt: days(2),
    },
    {
      id: "t5",
      ownerId,
      title: "Preparar relatório mensal da carteira",
      dueAt: ahead(4),
      priority: "baixa",
      done: false,
      createdAt: days(3),
    },
  ];
}

export function buildMockProposals(ownerId: string, clients: Client[]): Proposal[] {
  return [
    {
      id: "p1",
      ownerId,
      clientId: clients[0].id,
      title: "Migração para o ML — Albuquerque Têxtil",
      amount: 168_000,
      status: "aceita",
      createdAt: days(40),
      sentAt: days(38),
    },
    {
      id: "p2",
      ownerId,
      clientId: clients[3].id,
      title: "Contrato anual — Hospital São Lucas",
      amount: 372_000,
      status: "aceita",
      createdAt: days(110),
      sentAt: days(108),
    },
    {
      id: "p3",
      ownerId,
      clientId: clients[2].id,
      title: "Revisão de demanda — RP Supermercados",
      amount: 98_400,
      status: "enviada",
      createdAt: days(12),
      sentAt: days(10),
    },
    {
      id: "p4",
      ownerId,
      clientId: clients[6].id,
      title: "Diagnóstico — Mendonça Materiais",
      amount: 45_000,
      status: "enviada",
      createdAt: days(3),
      sentAt: days(2),
    },
    {
      id: "p5",
      ownerId,
      clientId: clients[7].id,
      title: "Simulação inicial — Andrade Distribuidora",
      amount: 32_000,
      status: "rascunho",
      createdAt: days(1),
    },
  ];
}

export function buildMockNotifications(ownerId: string): Notification[] {
  return [
    {
      id: "n1",
      ownerId,
      kind: "lead",
      title: "Novo lead recebido",
      body: "Andrade Distribuidora pediu uma simulação.",
      createdAt: hours(2),
      read: false,
      href: "/plataforma/clientes",
    },
    {
      id: "n2",
      ownerId,
      kind: "tarefa",
      title: "Tarefa vence hoje",
      body: "Ligar para Patrícia Mendonça.",
      createdAt: hours(5),
      read: false,
    },
    {
      id: "n3",
      ownerId,
      kind: "pagamento",
      title: "Próxima cobrança em 18 dias",
      body: "musclePro — débito automático.",
      createdAt: days(1),
      read: true,
    },
    {
      id: "n4",
      ownerId,
      kind: "sistema",
      title: "Atualização do simulador",
      body: "Nova versão com tarifas de abril/2026.",
      createdAt: days(3),
      read: true,
    },
  ];
}

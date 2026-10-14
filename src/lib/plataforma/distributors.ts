import type { Submercado } from "./types";

export type DistributorLocation = {
  state: string;
  label: string;
  submercado: Submercado;
  distributors: string[];
};

export const DISTRIBUTOR_LOCATIONS: DistributorLocation[] = [
  {
    state: "SP",
    label: "Sao Paulo",
    submercado: "SE/CO",
    distributors: ["CPFL Paulista", "CPFL Piratininga", "Enel SP", "EDP SP", "Neoenergia Elektro"],
  },
  {
    state: "RJ",
    label: "Rio de Janeiro",
    submercado: "SE/CO",
    distributors: ["Light", "Enel RJ", "Energisa Nova Friburgo"],
  },
  {
    state: "MG",
    label: "Minas Gerais",
    submercado: "SE/CO",
    distributors: ["Cemig", "Energisa MG", "DMED"],
  },
  {
    state: "PR",
    label: "Parana",
    submercado: "S",
    distributors: ["Copel"],
  },
  {
    state: "SC",
    label: "Santa Catarina",
    submercado: "S",
    distributors: ["Celesc", "Cooperaliança"],
  },
  {
    state: "RS",
    label: "Rio Grande do Sul",
    submercado: "S",
    distributors: ["CEEE Equatorial", "RGE"],
  },
  {
    state: "BA",
    label: "Bahia",
    submercado: "NE",
    distributors: ["Neoenergia Coelba"],
  },
  {
    state: "PE",
    label: "Pernambuco",
    submercado: "NE",
    distributors: ["Neoenergia Pernambuco"],
  },
  {
    state: "CE",
    label: "Ceara",
    submercado: "NE",
    distributors: ["Enel CE"],
  },
  {
    state: "GO",
    label: "Goias",
    submercado: "SE/CO",
    distributors: ["Equatorial GO"],
  },
  {
    state: "DF",
    label: "Distrito Federal",
    submercado: "SE/CO",
    distributors: ["Neoenergia Brasilia"],
  },
  {
    state: "PA",
    label: "Para",
    submercado: "N",
    distributors: ["Equatorial PA"],
  },
  {
    state: "AM",
    label: "Amazonas",
    submercado: "N",
    distributors: ["Amazonas Energia"],
  },
];

export function getLocationByState(state?: string) {
  return DISTRIBUTOR_LOCATIONS.find((location) => location.state === state);
}

export function getDistributorsForState(state?: string) {
  return getLocationByState(state)?.distributors ?? [];
}

export function getSubmercadoForState(state?: string): Submercado | undefined {
  return getLocationByState(state)?.submercado;
}

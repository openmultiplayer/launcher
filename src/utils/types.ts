// Core game-related types
export const RULE_TYPES = [
  "artwork",
  "mapname",
  "lagcomp",
  "version",
  "weather",
  "weburl",
  "worldtime",
] as const;

export type Rule = (typeof RULE_TYPES)[number];

export const LIST_TYPES = [
  "favorites",
  "internet",
  "partners",
  "recentlyjoined",
] as const;

export type ListType = (typeof LIST_TYPES)[number];

export const SORT_TYPES = ["none", "ascending", "descending"] as const;

export type SortType = (typeof SORT_TYPES)[number];

export const SAMP_DLL_VERSIONS = [
  "037R1_samp.dll",
  "037R2_samp.dll",
  "037R3_samp.dll",
  "037R31_samp.dll",
  "037R4_samp.dll",
  "037R5_samp.dll",
  "03DL_samp.dll",
  "custom",
] as const;

export type SAMPDLLVersions = (typeof SAMP_DLL_VERSIONS)[number];

// Server-related interfaces with improved type safety
export interface Player {
  name: string;
  score: number;
}

export interface ServerRules {
  artwork: string;
  mapname: string;
  lagcomp: string;
  version: string;
  weather: string;
  weburl: string;
  worldtime: string;
  [key: string]: string;
}

export interface ServerOMP {
  bannerLight?: string;
  bannerDark?: string;
  discordInvite?: string;
  logo?: string;
}

export interface Server {
  ip: string;
  port: number;
  hostname: string;
  playerCount: number;
  maxPlayers: number;
  gameMode: string;
  language: string;
  hasPassword: boolean;
  version: string;
  usingOmp: boolean;
  partner: boolean;
  ping: number;
  players: Player[];
  password: string;
  omp?: ServerOMP;
  rules: ServerRules;
}

// Search and filter types
export interface SearchData {
  query: string;
  ompOnly: boolean;
  nonEmpty: boolean;
  unpassworded: boolean;
  sortPlayer: SortType;
  sortPing: SortType;
  sortName: SortType;
  sortMode: SortType;
  languages: string[];
}

// API response types
export interface APIResponseServerCore {
  gm: string;
  hn: string;
  ip: string;
  la: string;
  pa: boolean;
  pc: number;
  pm: number;
  vn: string;
  omp: boolean;
  pr: boolean;
}

export interface APIResponseServer {
  core: APIResponseServerCore;
  ru: ServerRules;
}

// Settings types
export interface PerServerSettings {
  ipPort: string;
  nickname?: string;
  sampVersion?: SAMPDLLVersions;
}

// Utility types for better type safety
export type ServerEndpoint = `${string}:${number}`;

export interface ServerIdentifier {
  ip: string;
  port: number;
}

// Type guards
export const isValidSortType = (value: string): value is SortType => {
  return SORT_TYPES.includes(value as SortType);
};

export const isValidListType = (value: string): value is ListType => {
  return LIST_TYPES.includes(value as ListType);
};

export const isValidSAMPVersion = (value: string): value is SAMPDLLVersions => {
  return SAMP_DLL_VERSIONS.includes(value as SAMPDLLVersions);
};

// Helper functions for server operations
export const getServerEndpoint = (server: ServerIdentifier): ServerEndpoint => {
  return `${server.ip}:${server.port}` as ServerEndpoint;
};

export const parseServerEndpoint = (
  endpoint: ServerEndpoint
): ServerIdentifier => {
  const [ip, portStr] = endpoint.split(":");
  return {
    ip,
    port: parseInt(portStr, 10),
  };
};

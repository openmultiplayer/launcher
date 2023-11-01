export type Rule =
  | "artwork"
  | "mapname"
  | "lagcomp"
  | "version"
  | "weather"
  | "weburl"
  | "worldtime";

export type ListType = "favorites" | "internet" | "partners" | "recentlyjoined";
export type SortType = "none" | "ascending" | "descending";

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
  rules: {
    artwork: string;
    mapname: string;
    lagcomp: string;
    version: string;
    weather: string;
    weburl: string;
    worldtime: string;

    [x: string]: string;
  };
}

export interface Player {
  name: string;
  score: number;
}

export interface SearchData {
  query: string;
  ompOnly: boolean;
  nonEmpty: boolean;
  sortPlayer: SortType;
  sortPing: SortType;
}

export interface APIResponseServer {
  core: {
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
  };
  ru: {
    [x: string]: string;
  };
}

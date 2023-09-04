export type Rule =
  | "artwork"
  | "mapname"
  | "lagcomp"
  | "version"
  | "weather"
  | "weburl"
  | "worldtime";

export type ListType = "favorites" | "internet" | "partners";

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
}

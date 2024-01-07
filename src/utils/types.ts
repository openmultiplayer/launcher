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
  password: string;
  omp?: {
    bannerLight?: string;
    bannerDark?: string;
    discordInvite?: string;
    discordStatus?: {
      appId: string;
      largeImage: {
        asset: string;
        text: string;
      };
      smallImage: {
        asset: string;
        text: string;
      };
      title: string;
      description: string;
    };
  };
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
  unpassworded: boolean;
  sortPlayer: SortType;
  sortPing: SortType;
  sortName: SortType;
  sortMode: SortType;
  languages: string[];
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

export type SAMPDLLVersions =
  | "037R1_samp.dll"
  | "037R2_samp.dll"
  | "037R3_samp.dll"
  | "037R31_samp.dll"
  | "037R4_samp.dll"
  | "037R5_samp.dll"
  | "03DL_samp.dll"
  | "custom";

export interface PerServerSettings {
  nickname: string;
  sampVersion: SAMPDLLVersions;
}

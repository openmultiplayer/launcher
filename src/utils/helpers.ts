import { invoke } from "@tauri-apps/api";
import { getCachedList, getUpdateInfo } from "../api/apis";
import { useAppState } from "../states/app";
import { usePersistentServersStore, useServers } from "../states/servers";
import { Player, Server, APIResponseServer } from "./types";

export const mapAPIResponseServerListToAppStructure = (
  list: APIResponseServer[]
) => {
  const restructuredList: Server[] = list.map((server) => {
    return {
      hostname: server.core.hn,
      gameMode: server.core.gm,
      ip: server.core.ip.split(":")[0],
      port: parseInt(server.core.ip.split(":")[1]),
      language: server.core.la,
      hasPassword: server.core.pa,
      playerCount: server.core.pc,
      maxPlayers: server.core.pm,
      version: server.core.vn,
      rules: server.ru,
      players: [] as Player[],
      ping: 0,
      usingOmp: server.core.omp,
      partner: server.core.pr,
    } as Server;
  });

  return restructuredList;
};

export const fetchServers = async (cached: boolean = true) => {
  if (cached) {
    const response = await getCachedList();
    useServers.getState().setServers(response.servers);
    console.log(response);
  }
};

export const fetchUpdateInfo = async (cached: boolean = true) => {
  if (cached) {
    const response = await getUpdateInfo();
    if (response.info) {
      useAppState.getState().setUpdateInfo(response.info);
    }
    console.log(response);
  }
};

export const startGame = (
  nickname: string,
  ip: string,
  port: number,
  gtasaPath: string,
  sampDllPath: string,
  password: string
) => {
  const { addToRecentlyJoined } = usePersistentServersStore.getState();
  addToRecentlyJoined(`${ip}:${port}`);
  invoke("inject", {
    name: nickname,
    ip: ip,
    port: port,
    exe: gtasaPath,
    dll: sampDllPath,
    password: password,
  });
};

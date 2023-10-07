import { getCachedList, getUpdateInfo } from "../api/apis";
import { useAppInfo } from "../states/appInfo";
import { useTempServersStore } from "../states/servers";
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
    useTempServersStore.getState().setServers(response.servers);
    console.log(response);
  }
};

export const fetchUpdateInfo = async (cached: boolean = true) => {
  if (cached) {
    const response = await getUpdateInfo();
    if (response.info) {
      useAppInfo.getState().setUpdateInfo(response.info);
    }
    console.log(response);
  }
};

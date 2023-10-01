import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Server } from "../utils/types";

interface ServersTempState {
  servers: Server[];
  selected: undefined | Server;
  setSelected: (server: undefined | Server) => void;
  setServers: (list: Server[]) => void;
  updateServer: (server: Server) => void;
}

interface ServersPersistentState {
  favorites: Server[];
  recentlyJoined: string[];
  setFavoritesList: (list: Server[]) => void;
  updateInFavoritesList: (server: Server) => void;
  addToRecentlyJoined: (address: string) => void;
}

const useTempServersStore = create<ServersTempState>()((set, get) => ({
  servers: [],
  selected: undefined,
  setSelected: (server) => set(() => ({ selected: server })),
  setServers: (list) => set(() => ({ servers: list })),
  updateServer: (server) =>
    set(() => {
      console.log("upadting selected server");
      const list = [...get().servers];

      const index = list.findIndex(
        (srv) => srv.ip === server.ip && srv.port === server.port
      );
      if (index !== -1) {
        list[index] = { ...server };
      }

      return { servers: list };
    }),
}));

const usePersistentServersStore = create<ServersPersistentState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentlyJoined: [],
      setFavoritesList: (list) => set({ favorites: list }),
      updateInFavoritesList: (server) =>
        set(() => {
          const list = [...get().favorites];

          const index = list.findIndex(
            (srv) => srv.ip === server.ip && srv.port === server.port
          );
          if (index !== -1) {
            list[index] = { ...server };
          }

          return { favorites: list };
        }),
      addToRecentlyJoined: (address) =>
        set(() => {
          const cpy = [...get().recentlyJoined];
          const findIndex = cpy.findIndex((addr) => addr === address);
          if (findIndex !== -1) {
            cpy.splice(findIndex, 1);
            cpy.push(address);
          } else {
            cpy.push(address);
          }
          return { recentlyJoined: cpy };
        }),
    }),
    {
      name: "favorites-and-recentlyjoined-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { usePersistentServersStore, useTempServersStore };

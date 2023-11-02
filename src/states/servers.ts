import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Server } from "../utils/types";
import { useNotification } from "./notification";

interface ServersState {
  servers: Server[];
  selected: undefined | Server;
  setSelected: (server: undefined | Server) => void;
  setServers: (list: Server[]) => void;
  updateServer: (server: Server) => void;
}

interface ServersPersistentState {
  favorites: Server[];
  recentlyJoined: Server[];
  setFavoritesList: (list: Server[]) => void;
  updateInFavoritesList: (server: Server) => void;
  addToFavorites: (server: Server) => void;
  removeFromFavorites: (server: Server) => void;
  addToRecentlyJoined: (address: Server) => void;
  clearRecentlyJoined: () => void;
  updateInRecentlyJoinedList: (server: Server) => void;
}

const useServers = create<ServersState>()((set, get) => ({
  servers: [],
  selected: undefined,
  setSelected: (server) => set(() => ({ selected: server })),
  setServers: (list) => set(() => ({ servers: list })),
  updateServer: (server) =>
    set(() => {
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
      addToFavorites: (server) =>
        set(() => {
          const cpy = [...get().favorites];
          const findIndex = cpy.findIndex(
            (srv) => srv.ip === server.ip && srv.port === server.port
          );
          if (findIndex !== -1) {
            cpy.splice(findIndex, 1);
            cpy.push(server);
          } else {
            cpy.push(server);
          }

          const { showNotification } = useNotification.getState();
          showNotification(
            "Added to Favorites!",
            `${server.ip}:${server.port} has been added to your favorite list`
          );

          return { favorites: cpy };
        }),
      removeFromFavorites: (server) =>
        set(() => {
          const cpy = [...get().favorites];
          const findIndex = cpy.findIndex(
            (srv) => srv.ip === server.ip && srv.port === server.port
          );
          if (findIndex !== -1) {
            cpy.splice(findIndex, 1);
          }
          return { favorites: cpy };
        }),
      addToRecentlyJoined: (server) =>
        set(() => {
          const cpy = [...get().recentlyJoined];
          const findIndex = cpy.findIndex(
            (srv) => srv.ip === server.ip && srv.port === server.port
          );
          if (findIndex !== -1) {
            cpy.splice(findIndex, 1);
            cpy.push(server);
          } else {
            cpy.push(server);
          }

          return { recentlyJoined: cpy };
        }),
      clearRecentlyJoined: () => set(() => ({ recentlyJoined: [] })),
      updateInRecentlyJoinedList: (server) =>
        set(() => {
          const list = [...get().recentlyJoined];

          const index = list.findIndex(
            (srv) => srv.ip === server.ip && srv.port === server.port
          );
          if (index !== -1) {
            list[index] = { ...server };
          }

          return { recentlyJoined: list };
        }),
    }),
    {
      name: "favorites-and-recentlyjoined-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { usePersistentServersStore, useServers };

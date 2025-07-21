import { emit, listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import { t } from "i18next";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { queryServer } from "../utils/query";
import { stateStorage } from "../utils/stateStorage";
import { PerServerSettings, SAMPDLLVersions, Server } from "../utils/types";
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
  perServerSettings: PerServerSettings[];
  setFavoritesList: (list: Server[]) => void;
  updateInFavoritesList: (server: Server) => void;
  addToFavorites: (server: Server) => void;
  removeFromFavorites: (server: Server) => void;
  addToRecentlyJoined: (address: Server) => void;
  clearRecentlyJoined: () => void;
  updateInRecentlyJoinedList: (server: Server) => void;
  setServerSettings: (
    server: Server,
    nickname: string | undefined,
    version: SAMPDLLVersions | undefined
  ) => void;
  getServerSettings: (server: Server) => PerServerSettings | undefined;
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

const usePersistentServers = create<ServersPersistentState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentlyJoined: [],
      perServerSettings: [],
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

          setTimeout(() => {
            emit("updateInFavoritesList", server);
          }, 200);

          return { favorites: list };
        }),
      addToFavorites: (server) =>
        set(() => {
          // Validate server before adding
          if (
            (typeof server.ip !== "string" && isNaN(server.ip)) ||
            server.ip === "NaN" ||
            // @ts-ignore
            server.port === "NaN" ||
            isNaN(Number(server.port)) ||
            server.ip.length < 6 ||
            server.port < 1
          ) {
            return { favorites: get().favorites };
          }
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
            t("notification_add_to_favorites_title"),
            t("notification_add_to_favorites_description", {
              server: `${server.ip}:${server.port}`,
            })
          );

          queryServer(server, "favorites", "basic");

          setTimeout(() => {
            emit("addToFavorites", server);
          }, 200);

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

          setTimeout(() => {
            emit("addToFavorites", server);
          }, 200);

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

          setTimeout(() => {
            emit("addToFavorites", server);
          }, 200);

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

          setTimeout(() => {
            emit("addToFavorites", server);
          }, 200);

          return { recentlyJoined: list };
        }),
      setServerSettings: (server, nickname, version) =>
        set(() => {
          const list = [...get().perServerSettings];

          const index = list.findIndex(
            (srv) => srv.ipPort === `${server.ip}:${server.port}`
          );
          if (index !== -1) {
            list[index] = {
              ipPort: `${server.ip}:${server.port}`,
              nickname,
              sampVersion: version,
            };
          } else {
            list.push({
              ipPort: `${server.ip}:${server.port}`,
              nickname,
              sampVersion: version,
            });
          }

          return { perServerSettings: list };
        }),
      getServerSettings: (server) => {
        const list = [...get().perServerSettings];

        const index = list.findIndex(
          (srv) => srv.ipPort === `${server.ip}:${server.port}`
        );
        if (index !== -1) {
          return { ...list[index] };
        } else {
          return undefined;
        }
      },
    }),
    {
      name: "favorites-and-recentlyjoined-storage",
      storage: createJSONStorage(() => stateStorage),
    }
  )
);

listen("updateInFavoritesList", (ev) => {
  if (ev.windowLabel != appWindow.label) {
    usePersistentServers.persist.rehydrate();
  }
});

listen("addToFavorites", (ev) => {
  if (ev.windowLabel != appWindow.label) {
    usePersistentServers.persist.rehydrate();
  }
});

listen("addToRecentlyJoined", (ev) => {
  if (ev.windowLabel != appWindow.label) {
    usePersistentServers.persist.rehydrate();
  }
});

listen("removeFromFavorites", (ev) => {
  if (ev.windowLabel != appWindow.label) {
    usePersistentServers.persist.rehydrate();
  }
});

listen("updateInRecentlyJoinedList", (ev) => {
  if (ev.windowLabel != appWindow.label) {
    usePersistentServers.persist.rehydrate();
  }
});

export { usePersistentServers, useServers };

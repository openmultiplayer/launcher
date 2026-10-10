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
  selected?: Server;
  setSelected: (server?: Server) => void;
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
  addToRecentlyJoined: (server: Server) => void;
  clearRecentlyJoined: () => void;
  updateInRecentlyJoinedList: (server: Server) => void;
  setServerSettings: (
    server: Server,
    nickname?: string,
    version?: SAMPDLLVersions
  ) => void;
  getServerSettings: (server: Server) => PerServerSettings | undefined;
  reorderFavorites: (fromIndex: number, toIndex: number) => void;
}

const isSameServer = (a: Server, b: Server) =>
  a.ip === b.ip && a.port === b.port;

const updateListItem = <T extends Server>(
  list: T[],
  server: Server,
  replace: (oldItem: T) => T
) => {
  const index = list.findIndex((s) => isSameServer(s, server));
  if (index !== -1) list[index] = replace(list[index]);
  return list;
};

const upsertServer = (list: Server[], server: Server) => {
  const index = list.findIndex((s) => isSameServer(s, server));
  if (index !== -1) list.splice(index, 1);
  list.push(server);
  return list;
};

const emitWithDelay = (event: string, payload: any) =>
  setTimeout(() => emit(event, payload), 200);

const useServers = create<ServersState>()((set, get) => ({
  servers: [],
  selected: undefined,
  setSelected: (server) => set({ selected: server }),
  setServers: (list) => set({ servers: list }),
  updateServer: (server) =>
    set({
      servers: updateListItem([...get().servers], server, () => ({
        ...server,
      })),
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
          const updated = updateListItem([...get().favorites], server, () => ({
            ...server,
          }));
          emitWithDelay("updateInFavoritesList", server);
          return { favorites: updated };
        }),

      addToFavorites: (server) =>
        set(() => {
          if (
            typeof server.ip !== "string" ||
            isNaN(Number(server.port)) ||
            server.ip.length < 6 ||
            server.port < 1
          ) {
            return { favorites: get().favorites };
          }

          const updated = upsertServer([...get().favorites], server);

          useNotification.getState().showNotification(
            t("notification_add_to_favorites_title"),
            t("notification_add_to_favorites_description", {
              server: `${server.ip}:${server.port}`,
            })
          );

          queryServer(server, "favorites", "basic");
          emitWithDelay("addToFavorites", server);

          return { favorites: updated };
        }),

      removeFromFavorites: (server) =>
        set(() => {
          const updated = get().favorites.filter(
            (s) => !isSameServer(s, server)
          );
          emitWithDelay("removeFromFavorites", server);
          return { favorites: updated };
        }),

      addToRecentlyJoined: (server) =>
        set(() => {
          const updated = upsertServer([...get().recentlyJoined], server);
          emitWithDelay("addToRecentlyJoined", server);
          return { recentlyJoined: updated };
        }),

      clearRecentlyJoined: () => set({ recentlyJoined: [] }),

      updateInRecentlyJoinedList: (server) =>
        set(() => {
          const updated = updateListItem(
            [...get().recentlyJoined],
            server,
            () => ({ ...server })
          );
          emitWithDelay("updateInRecentlyJoinedList", server);
          return { recentlyJoined: updated };
        }),

      setServerSettings: (server, nickname, version) =>
        set(() => {
          const ipPort = `${server.ip}:${server.port}`;
          const updated = [...get().perServerSettings];
          const index = updated.findIndex((s) => s.ipPort === ipPort);

          const newSetting = { ipPort, nickname, sampVersion: version };

          if (index !== -1) updated[index] = newSetting;
          else updated.push(newSetting);

          return { perServerSettings: updated };
        }),

      getServerSettings: (server) =>
        get().perServerSettings.find(
          (s) => s.ipPort === `${server.ip}:${server.port}`
        ),

      reorderFavorites: (fromIndex, toIndex) =>
        set(() => {
          const updated = [...get().favorites];
          const [moved] = updated.splice(fromIndex, 1);
          updated.splice(toIndex, 0, moved);
          emitWithDelay("reorderFavorites", { fromIndex, toIndex });
          return { favorites: updated };
        }),
    }),
    {
      name: "favorites-and-recentlyjoined-storage",
      storage: createJSONStorage(() => stateStorage),
    }
  )
);

[
  "updateInFavoritesList",
  "addToFavorites",
  "addToRecentlyJoined",
  "removeFromFavorites",
  "updateInRecentlyJoinedList",
  "reorderFavorites",
].forEach((event) =>
  listen(event, (ev) => {
    if (ev.windowLabel !== appWindow.label) {
      usePersistentServers.persist.rehydrate();
    }
  })
);

export { usePersistentServers, useServers };

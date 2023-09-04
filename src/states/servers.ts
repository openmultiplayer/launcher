import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Server } from "../utils/types";

interface ServersTempState {
  internet: Server[];
  partners: Server[];
  setInternetList: (list: Server[]) => void;
  setPartnersList: (list: Server[]) => void;
}

interface ServersPersistentState {
  favorites: Server[];
  setFavoritesList: (list: Server[]) => void;
  updateInFavoritesList: (server: Server) => void;
}

const useTempServersStore = create<ServersTempState>()((set) => ({
  internet: [],
  partners: [],
  setInternetList: (list) => set(() => ({ internet: list })),
  setPartnersList: (list) => set(() => ({ partners: list })),
}));

const useFavServersStore = create<ServersPersistentState>()(
  persist(
    (set, get) => ({
      favorites: [],
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
    }),
    {
      name: "favorites-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { useTempServersStore, useFavServersStore };

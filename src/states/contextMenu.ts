import { create } from "zustand";
import { Server } from "../utils/types";

interface ContextMenuState {
  visible: boolean;
  position: { x: number; y: number };
  server: Server;
  show: (pos: { x: number; y: number }, server: Server) => void;
  hide: () => void;
}

const useContextMenu = create<ContextMenuState>()((set) => ({
  visible: false,
  position: { x: 0, y: 0 },
  server: {} as Server,
  show: (pos, server) =>
    set(() => ({ visible: true, position: pos, server: server })),
  hide: () => set(() => ({ visible: false })),
}));

export { useContextMenu };

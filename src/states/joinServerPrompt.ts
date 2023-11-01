import { create } from "zustand";
import { Server } from "../utils/types";

interface JoinServerPromptState {
  visible: boolean;
  server: Server | undefined;
  showPrompt: (show: boolean) => void;
  setServer: (server: Server) => void;
}

const useJoinServerPrompt = create<JoinServerPromptState>()((set) => ({
  visible: false,
  server: undefined,
  showPrompt: (show) => set(() => ({ visible: show })),
  setServer: (server) => set(() => ({ server })),
}));

export { useJoinServerPrompt };

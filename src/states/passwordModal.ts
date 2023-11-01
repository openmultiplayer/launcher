import { create } from "zustand";
import { Server } from "../utils/types";

interface PasswordModalState {
  visible: boolean;
  server: Server | undefined;
  showPasswordModal: (show: boolean) => void;
  setServer: (server: Server) => void;
}

const usePasswordModal = create<PasswordModalState>()((set) => ({
  visible: false,
  server: undefined,
  showPasswordModal: (show) => set(() => ({ visible: show })),
  setServer: (server) => set(() => ({ server })),
}));

export { usePasswordModal };

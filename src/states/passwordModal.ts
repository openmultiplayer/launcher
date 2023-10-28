import { create } from "zustand";

interface PasswordModalState {
  visible: boolean;
  serverIP: string;
  serverPort: number;
  showPasswordModal: (show: boolean) => void;
  setServerInfo: (ip: string, port: number) => void;
}

const usePasswordModal = create<PasswordModalState>()((set) => ({
  visible: false,
  serverIP: "",
  serverPort: 0,
  showPasswordModal: (show) => set(() => ({ visible: show })),
  setServerInfo: (ip: string, port: number) =>
    set(() => ({ serverIP: ip, serverPort: port })),
}));

export { usePasswordModal };

import { create } from "zustand";

interface NotificationState {
  visible: boolean;
  title: string;
  description: string;
  showNotification: (title: string, description: string) => void;
  slideDown: () => void;
  deleteNotification: () => void;
}

const useNotification = create<NotificationState>()((set) => ({
  visible: false,
  title: "",
  description: "",
  showNotification: (title, description) =>
    set(() => ({ title, description, visible: true })),
  slideDown: () => set(() => ({ visible: false })),
  deleteNotification: () =>
    set(() => ({ title: "", description: "", visible: false })),
}));

export { useNotification };

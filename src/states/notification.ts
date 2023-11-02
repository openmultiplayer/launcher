import { create } from "zustand";

interface NotificationState {
  visible: boolean;
  title: string;
  description: string;
  onPress?: () => void;
  showNotification: (
    title: string,
    description: string,
    onPress?: () => void
  ) => void;
  slideDown: () => void;
  deleteNotification: () => void;
}

const useNotification = create<NotificationState>()((set) => ({
  visible: false,
  title: "",
  description: "",
  onPress: undefined,
  showNotification: (title, description, onPress) =>
    set(() => ({ title, description, visible: true, onPress })),
  slideDown: () => set(() => ({ visible: false })),
  deleteNotification: () =>
    set(() => ({ title: "", description: "", visible: false })),
}));

export { useNotification };

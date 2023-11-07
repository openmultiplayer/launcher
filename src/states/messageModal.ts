import { create } from "zustand";

export interface MessageBoxArgs {
  title: string;
  description: string;
  buttons: {
    title: string;
    onPress: () => void;
  }[];
}

interface MessageModalState {
  visible: boolean;
  args: MessageBoxArgs;
  showMessageBox: (args: MessageBoxArgs) => void;
  _hideMessageBox: () => void;
}

const useMessageBox = create<MessageModalState>()((set) => ({
  visible: false,
  args: {
    title: "",
    description: "",
    buttons: [],
  },
  showMessageBox: (args) => set(() => ({ visible: true, args })),
  _hideMessageBox: () =>
    set(() => ({
      visible: false,
      args: {
        title: "",
        description: "",
        buttons: [],
      },
    })),
}));

export { useMessageBox };

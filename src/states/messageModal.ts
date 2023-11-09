import { create } from "zustand";

export interface MessageBoxArgs {
  title: string;
  description: string;
  buttons: {
    title: string;
    onPress: () => void;
  }[];
  boxWidth?: number;
}

interface MessageModalState {
  visible: boolean;
  args: MessageBoxArgs;
  showMessageBox: (args: MessageBoxArgs) => void;
  hideMessageBox: () => void;
}

const MESSAGE_BOX_WIDTH = 320;

const useMessageBox = create<MessageModalState>()((set) => ({
  visible: false,
  args: {
    title: "",
    description: "",
    buttons: [],
  },
  showMessageBox: (args) =>
    set(() => ({
      visible: true,
      args: {
        ...args,
        boxWidth: args.boxWidth ? args.boxWidth : MESSAGE_BOX_WIDTH,
      },
    })),
  hideMessageBox: () =>
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

import { create } from "zustand";

export interface MessageBoxArgs {
  title: string;
  description: string;
  buttons: {
    title: string;
    onPress: () => void;
  }[];
  boxWidth?: number;
  buttonWidth?: number;
}

interface MessageModalState {
  visible: boolean;
  args: MessageBoxArgs;
  showMessageBox: (args: MessageBoxArgs) => void;
  hideMessageBox: () => void;
}

const MESSAGE_BOX_WIDTH = 320;
const MESSAGE_BOX_BUTTON_WIDTH = 120;

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
        buttonWidth: args.buttonWidth
          ? args.buttonWidth
          : MESSAGE_BOX_BUTTON_WIDTH,
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

import { create } from "zustand";

interface AddThirdPartyServerModal {
  visible: boolean;
  showAddThirdPartyServer: (show: boolean) => void;
}

const useAddThirdPartyServerModal = create<AddThirdPartyServerModal>()((set) => ({
  visible: false,
  showAddThirdPartyServer: (show) => set(() => ({ visible: show })),
}));

export { useAddThirdPartyServerModal };

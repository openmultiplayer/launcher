import { create } from "zustand";
import { VERSION } from "../constants/app";

export interface UpdateInfo {
  version: string;
  download: string;
  changelog: string;
}

interface AppState {
  version: string;
  maximized: boolean;
  updateInfo: UpdateInfo | undefined;
  toggleMaximized: (enable: boolean) => void;
  setUpdateInfo: (data: UpdateInfo) => void;
}

const useAppState = create<AppState>()((set) => ({
  version: VERSION,
  maximized: false,
  updateInfo: undefined,
  toggleMaximized: (enable: boolean) => set(() => ({ maximized: enable })),
  setUpdateInfo: (data: UpdateInfo) => set(() => ({ updateInfo: data })),
}));

export { useAppState };

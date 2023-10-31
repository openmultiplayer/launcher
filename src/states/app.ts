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
  nativeAppVersion: string;
  toggleMaximized: (enable: boolean) => void;
  setUpdateInfo: (data: UpdateInfo) => void;
  setNativeAppVersionValue: (data: string) => void;
}

const useAppState = create<AppState>()((set) => ({
  version: VERSION,
  maximized: false,
  updateInfo: undefined,
  nativeAppVersion: "",
  toggleMaximized: (enable: boolean) => set(() => ({ maximized: enable })),
  setUpdateInfo: (data: UpdateInfo) => set(() => ({ updateInfo: data })),
  setNativeAppVersionValue: (data: string) =>
    set(() => ({ nativeAppVersion: data })),
}));

export { useAppState };

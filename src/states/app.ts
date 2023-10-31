import { OsType } from "@tauri-apps/api/os";
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
  hostOS: OsType;
  toggleMaximized: (enable: boolean) => void;
  setUpdateInfo: (data: UpdateInfo) => void;
  setNativeAppVersionValue: (data: string) => void;
  setHostOSValue: (data: OsType) => void;
}

const useAppState = create<AppState>()((set) => ({
  version: VERSION,
  maximized: false,
  updateInfo: undefined,
  nativeAppVersion: "",
  hostOS: "" as OsType,
  toggleMaximized: (enable: boolean) => set(() => ({ maximized: enable })),
  setUpdateInfo: (data: UpdateInfo) => set(() => ({ updateInfo: data })),
  setNativeAppVersionValue: (data: string) =>
    set(() => ({ nativeAppVersion: data })),
  setHostOSValue: (data: OsType) => set(() => ({ hostOS: data })),
}));

export { useAppState };

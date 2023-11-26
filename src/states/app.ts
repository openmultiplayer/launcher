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
  updateInfo: UpdateInfo | undefined;
  skippedUpdateVersion: string;
  nativeAppVersion: string;
  hostOS: OsType;
  setUpdateInfo: (data: UpdateInfo) => void;
  setNativeAppVersionValue: (data: string) => void;
  setHostOSValue: (data: OsType) => void;
  skipUpdate: (version: string) => void;
}

const useAppState = create<AppState>()((set) => ({
  version: VERSION,
  updateInfo: undefined,
  skippedUpdateVersion: "",
  nativeAppVersion: "",
  hostOS: "" as OsType,
  listType: "favorites",
  setUpdateInfo: (data: UpdateInfo) => set(() => ({ updateInfo: data })),
  setNativeAppVersionValue: (data: string) =>
    set(() => ({ nativeAppVersion: data })),
  setHostOSValue: (data: OsType) => set(() => ({ hostOS: data })),
  skipUpdate: (version) => set(() => ({ skippedUpdateVersion: version })),
}));

export { useAppState };


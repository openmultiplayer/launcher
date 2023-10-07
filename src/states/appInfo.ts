import { create } from "zustand";
import { VERSION } from "../constants/app";

export interface UpdateInfo {
  version: string;
  download: string;
  changelog: string;
}

interface AppInfoState {
  version: string;
  updateInfo: UpdateInfo | undefined;
  setUpdateInfo: (data: UpdateInfo) => void;
}

const useAppInfo = create<AppInfoState>()((set) => ({
  version: VERSION,
  updateInfo: undefined,
  setUpdateInfo: (data: UpdateInfo) => set(() => ({ updateInfo: data })),
}));

export { useAppInfo };

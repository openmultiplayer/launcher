import { create } from "zustand";

interface GameLaunchState {
  // True while a game launch is in progress (Play clicked → game spawned).
  launching: boolean;
  setLaunching: (value: boolean) => void;
}

export const useGameLaunch = create<GameLaunchState>((set) => ({
  launching: false,
  setLaunching: (value) => set({ launching: value }),
}));

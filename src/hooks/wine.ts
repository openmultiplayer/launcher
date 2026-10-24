import { invoke } from "@tauri-apps/api";
import { appWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

let isWinePromise: Promise<boolean> | undefined;

const getIsWine = () => {
  if (!isWinePromise) {
    isWinePromise = invoke<boolean>("is_wine").catch(() => false);
  }
  return isWinePromise;
};

// Wine cannot show per-pixel transparency around the window, so the
// transparent margin and rounded corners render as a black box there.
// The launcher rounds the window itself under Wine (src-tauri/src/wine.rs).
export const useIsWine = (): boolean => {
  const [isWine, setIsWine] = useState(false);

  useEffect(() => {
    getIsWine().then(setIsWine);
  }, []);

  return isWine;
};

// Wider than the borderless resize inset wry hit-tests against.
const RESIZE_EDGE = 8;

// wry sets resize cursors near the window edges but leaves putting the
// arrow back to Chromium, which runs in another process and cannot change
// this window's cursor under Wine, so the resize cursor sticks.
export const useWineCursorReset = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let nearEdge = false;
    const onMouseMove = (event: MouseEvent) => {
      const isNearEdge =
        event.clientX < RESIZE_EDGE ||
        event.clientY < RESIZE_EDGE ||
        event.clientX > window.innerWidth - RESIZE_EDGE ||
        event.clientY > window.innerHeight - RESIZE_EDGE;

      if (nearEdge && !isNearEdge) {
        appWindow.setCursorIcon("default").catch(() => {});
      }
      nearEdge = isNearEdge;
    };

    // Leaving the window crosses an edge too.
    const onMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget) {
        nearEdge = true;
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseout", onMouseOut);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [enabled]);
};

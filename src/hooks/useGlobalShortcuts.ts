import { useEffect } from "react";
import { useAddThirdPartyServerModal } from "../states/addThirdPartyServerModal";
import { useContextMenu } from "../states/contextMenu";
import { useGenericTempState } from "../states/genericStates";
import { useJoinServerPrompt } from "../states/joinServerPrompt";
import { useMessageBox } from "../states/messageModal";
import { usePersistentServers, useServers } from "../states/servers";
import { useSettingsModal } from "../states/settingsModal";
import { useShortcuts } from "../states/shortcuts";
import { useTheme } from "../states/theme";
import { fetchServers } from "../utils/helpers";
import { eventMatchesShortcut } from "../utils/shortcutHelper";

export const useGlobalShortcuts = (enabled = true) => {
  const { shortcuts } = useShortcuts();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const match = shortcuts.find((sc) => eventMatchesShortcut(e, sc.currentKey));
      if (!match) return;

      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isInput) {
        const isModifier = e.ctrlKey || e.altKey || e.metaKey;
        const isFKey = e.key.startsWith("F") && e.key.length > 1;
        const isEscape = e.key === "Escape";

        if (!isModifier && !isFKey && !isEscape) {
          return;
        }
      }

      switch (match.id) {
        case "search": {
          e.preventDefault();
          const el = document.getElementById("server-search-input") as HTMLInputElement | null;
          if (el) {
            el.focus();
            el.select();
          }
          break;
        }

        case "refresh":
          e.preventDefault();
          fetchServers();
          break;

        case "connect": {
          const { selected } = useServers.getState();
          if (selected) {
            e.preventDefault();
            const { showPrompt, setServer } = useJoinServerPrompt.getState();
            setServer(selected);
            showPrompt(true);
          }
          break;
        }

        case "add_server":
          e.preventDefault();
          useAddThirdPartyServerModal.getState().showAddThirdPartyServer(true);
          break;

        case "favorite": {
          const { selected } = useServers.getState();
          if (selected) {
            e.preventDefault();
            const { favorites, addToFavorites, removeFromFavorites } = usePersistentServers.getState();
            const isFav = favorites.some((fav) => fav.ip === selected.ip && fav.port === selected.port);
            if (isFav) removeFromFavorites(selected);
            else addToFavorites(selected);
          }
          break;
        }

        case "filter":
          e.preventDefault();
          const { filterMenu, showFilterMenu } = useGenericTempState.getState();
          showFilterMenu(!filterMenu);
          break;

        case "settings": {
          e.preventDefault();
          const { visible, show, hide } = useSettingsModal.getState();
          if (visible) hide();
          else show();
          break;
        }

        case "theme": {
          e.preventDefault();
          const { themeType, setTheme } = useTheme.getState();
          setTheme(themeType === "dark" ? "light" : "dark");
          break;
        }

        case "close_modal": {
          const { visible: settingsVisible, hide: hideSettings } = useSettingsModal.getState();
          const { visible: promptVisible, showPrompt } = useJoinServerPrompt.getState();
          const { filterMenu, showFilterMenu } = useGenericTempState.getState();
          const { visible: thirdPartyVisible, showAddThirdPartyServer } = useAddThirdPartyServerModal.getState();
          const { visible: msgBoxVisible, hideMessageBox } = useMessageBox.getState();
          const { visible: contextMenuVisible, hide: hideContextMenu } = useContextMenu.getState();

          if (isInput && target) target.blur();

          if (contextMenuVisible) {
            e.preventDefault();
            hideContextMenu();
          } else if (settingsVisible) {
            e.preventDefault();
            hideSettings();
          } else if (promptVisible) {
            e.preventDefault();
            showPrompt(false);
          } else if (filterMenu) {
            e.preventDefault();
            showFilterMenu(false);
          } else if (thirdPartyVisible) {
            e.preventDefault();
            showAddThirdPartyServer(false);
          } else if (msgBoxVisible) {
            e.preventDefault();
            hideMessageBox();
          } else {
            const { setSelected, selected } = useServers.getState();
            if (selected) {
              e.preventDefault();
              setSelected(undefined);
            }
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, shortcuts]);
};

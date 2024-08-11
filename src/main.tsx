import ReactDOM from "react-dom/client";
import App from "./App";
import "./locales";
import { useGenericPersistentState } from "./states/genericStates";
import { usePersistentServers } from "./states/servers";
import { useSettings } from "./states/settings";
import { useTheme } from "./states/theme";
import nativeStorage from "./utils/nativeStorage";

async function runner() {
  const favsStr = localStorage.getItem("favorites-and-recentlyjoined-storage");
  const genericStr = localStorage.getItem("generic-state-storage");
  const settingsStr = localStorage.getItem("settings-storage");
  const themeStr = localStorage.getItem("theme-storage");

  if (favsStr) {
    const favs = JSON.parse(favsStr);
    const settingsNewStr = await nativeStorage.getItem("settings-storage");

    const hasNativeData =
      settingsNewStr === null
        ? false
        : JSON.parse(settingsNewStr).state.dataMerged;

    if (
      Array.isArray(favs.state.favorites) &&
      favs.state.favorites.length &&
      !hasNativeData
    ) {
      usePersistentServers.setState(favs.state);

      if (genericStr) {
        const generic = JSON.parse(genericStr);
        useGenericPersistentState.setState(generic.state);
      }

      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        useSettings.setState({ ...settings.state, dataMerged: true });
      }

      if (themeStr) {
        const theme = JSON.parse(themeStr);
        useTheme.setState(theme.state);
      }
    }
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <App />
  );
}

runner();

import { shell } from "@tauri-apps/api";
import { t } from "i18next";
import { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Icon from "../../components/Icon";
import StaticModal from "../../components/StaticModal";
import TabBar from "../../components/TabBar";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { useAppState } from "../../states/app";
import { useGenericPersistentState } from "../../states/genericStates";
import { useSettingsModal } from "../../states/settingsModal";
import { useTheme } from "../../states/theme";
import { sc } from "../../utils/sizeScaler";
import Advanced from "./Tab/Advanced";
import General from "./Tab/General";
import Languages from "./Tab/Languages";
import i18n from "../../locales";

const MODAL_WIDTH = 500;
const MODAL_HEIGHT = 300;
const TITLEBAR_HEIGHT = 25;

type TabType = "general" | "languages" | "advanced";

const SettingsModal = () => {
  const { height, width } = useWindowDimensions();
  const { nativeAppVersion, version } = useAppState();
  const { theme } = useTheme();
  const { hide, visible } = useSettingsModal();
  const [selectedTab, setSelectedTab] = useState<TabType>("general");
  const { language } = useGenericPersistentState();

  const tabs = useMemo(
    () => [
      { label: t("settings_general_tab_title"), type: "general" },
      { label: t("settings_lang_tab_title"), type: "languages" },
      { label: t("settings_advanced_tab_title"), type: "advanced" },
    ],
    [t, i18n.language]
  );

  const tabComponents = useMemo(
    () => ({
      general: <General />,
      languages: <Languages />,
      advanced: <Advanced />,
    }),
    []
  );

  const handleTabChange = useCallback((type: TabType) => {
    setSelectedTab(type);
  }, []);

  const handleDismiss = useCallback(() => {
    hide();
  }, [hide]);

  const handleOpenMpPress = useCallback(() => {
    shell.open("https://open.mp/");
  }, []);

  const handleGithubPress = useCallback(() => {
    shell.open("https://github.com/openmultiplayer/launcher/");
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <StaticModal onDismiss={handleDismiss} key={"settings-" + language}>
      <View
        style={[
          styles.container,
          {
            top: height / 2 - MODAL_HEIGHT / 2 - TITLEBAR_HEIGHT,
            left: width / 2 - MODAL_WIDTH / 2,
            height: MODAL_HEIGHT,
            width: MODAL_WIDTH,
            backgroundColor: theme.secondary,
          },
        ]}
      >
        <TabBar
          list={tabs}
          onChange={(type) => handleTabChange(type as TabType)}
          selected={selectedTab}
          style={styles.tabBar}
        />
        {tabComponents[selectedTab]}
        <View style={styles.appInfoContainer}>
          <Text size={2} color={theme.textPrimary}>
            {t("settings_credits_made_by")}{" "}
            <Text size={2} onPress={handleOpenMpPress} color={theme.primary}>
              open.mp
            </Text>{" "}
            |{" "}
            <Text size={2} onPress={handleGithubPress} color={theme.primary}>
              {t("settings_credits_view_source_on_github")}
            </Text>{" "}
            | v{nativeAppVersion} Build {version}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <Icon
            image={images.icons.close}
            size={sc(20)}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </StaticModal>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: sc(11),
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  tabBar: {
    height: sc(30),
    paddingHorizontal: sc(15),
    marginTop: sc(15),
  },
  appInfoContainer: {
    height: 30,
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: sc(15),
    right: sc(15),
    height: sc(20),
    width: sc(20),
  },
});

export default SettingsModal;

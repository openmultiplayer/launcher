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
import Health from "./Tab/Health";
import Languages from "./Tab/Languages";
import i18n from "../../locales";

const MODAL_WIDTH = 520;
const MODAL_HEIGHT = 360;
const TITLEBAR_HEIGHT = 25;

type TabType = "general" | "languages" | "advanced" | "health";

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
      { label: t("settings_health_tab_title"), type: "health" },
    ],
    [t, i18n.language]
  );

  const tabComponents = useMemo(
    () => ({
      general: <General />,
      languages: <Languages />,
      advanced: <Advanced />,
      health: <Health />,
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

  const handleMacPortPress = useCallback(() => {
    shell.open("https://github.com/isiddharthasharma/open.mp-launcher-macOS");
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
            borderWidth: 1,
            borderColor: `${theme.textPrimary}1F`,
          },
        ]}
      >
        <TabBar
          list={tabs}
          onChange={(type) => handleTabChange(type as TabType)}
          selected={selectedTab}
          style={styles.tabBar}
        />
        <View
          style={[
            styles.tabDivider,
            { backgroundColor: `${theme.textPrimary}1F` },
          ]}
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
            | v{nativeAppVersion} (Build {version})
          </Text>
          <Text size={1} color={`${theme.textPrimary}AA`}>
            {t("settings_credits_macos_port")}{" "}
            <Text size={1} onPress={handleMacPortPress} color={theme.primary}>
              Siddharth
            </Text>
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
    borderRadius: sc(12),
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: sc(8),
    },
    shadowOpacity: 0.45,
    shadowRadius: sc(24),
  },
  tabBar: {
    height: sc(30),
    paddingHorizontal: sc(15),
    marginTop: sc(15),
  },
  tabDivider: {
    height: 1,
    marginTop: sc(10),
    marginHorizontal: sc(15),
    marginBottom: sc(4),
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

import Advanced from "./Tab/Advanced";
import General from "./Tab/General";
import Icon from "../../components/Icon";
import Languages from "./Tab/Languages";
import StaticModal from "../../components/StaticModal";
import TabBar from "../../components/TabBar";
import Text from "../../components/Text";
import { shell } from "@tauri-apps/api";
import { t } from "i18next";
import { useState } from "react";
import { images } from "../../constants/images";
import { useAppState } from "../../states/app";
import { useGenericPersistentState } from "../../states/genericStates";
import { useSettingsModal } from "../../states/settingsModal";
import { useTheme } from "../../states/theme";
import { sc } from "../../utils/sizeScaler";

import {
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const MODAL_WIDTH = 500;
const MODAL_HEIGHT = 300;

const SettingsModal = () => {
  const { height, width } = useWindowDimensions();
  const { nativeAppVersion, version } = useAppState();
  const { theme } = useTheme();
  const { hide, visible } = useSettingsModal();
  const [selectedTab, setSelectedTab] = useState("general");
  const { language } = useGenericPersistentState();

  const tabs = [
    { label: t("settings_general_tab_title"), type: "general" },
    { label: t("settings_lang_tab_title"), type: "languages" },
    { label: t("settings_advanced_tab_title"), type: "advanced" },
  ];

  if (!visible) {
    return null;
  }

  const renderTab = () => {
    if (selectedTab === "general") return <General />;
    else if (selectedTab === "languages") return <Languages />;
    else if (selectedTab === "advanced") return <Advanced />;
    else return null;
  };

  return (
    <StaticModal onDismiss={() => hide()} key={"settings-" + language}>
      <View
        style={[
          styles.container,
          {
            top: height / 2 - MODAL_HEIGHT / 2 - 25, // titlebar height is 25
            left: width / 2 - MODAL_WIDTH / 2,
            height: MODAL_HEIGHT,
            width: MODAL_WIDTH,
            backgroundColor: theme.secondary,
          },
        ]}
      >
        <TabBar
          list={tabs}
          onChange={(type) => setSelectedTab(type)}
          selected={selectedTab}
          style={{
            height: sc(30),
            paddingHorizontal: sc(15),
            marginTop: sc(15),
          }}
        />
        {renderTab()}
        <View style={styles.appInfoContainer}>
          <Text
            style={styles.appInfoContainer}
            size={2}
            color={theme.textPrimary}
          >
            <Text size={2}>
              {t("settings_credits_made_by")}
              <Text
                size={2}
                onPress={() => shell.open("https://open.mp/")}
                color={theme.primary}
              >
                {" open.mp"}
              </Text>
            </Text>
            <Text
              size={2}
              onPress={() =>
                shell.open("https://github.com/openmultiplayer/launcher/")
              }
              color={theme.primary}
            >
              {t("settings_credits_view_source_on_github")}
            </Text>
            v{nativeAppVersion} Build {version}
          </Text>
        </View>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: sc(15),
            right: sc(15),
            height: sc(20),
            width: sc(20),
          }}
          onPress={() => hide()}
        >
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
  appInfoContainer: {
    height: 65,
    justifyContent: "center",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 3,
    alignItems: "center",
  },
});

export default SettingsModal;

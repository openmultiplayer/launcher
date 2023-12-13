import { shell } from "@tauri-apps/api";
import { t } from "i18next";
import { useContext, useState } from "react";
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
import { ThemeContext } from "../../contexts/theme";
import { useAppState } from "../../states/app";
import { useGenericPersistentState } from "../../states/genericStates";
import { useSettingsModal } from "../../states/settingsModal";
import Appearance from "./Tab/Appearance";
import General from "./Tab/General";
import { sc } from "../../utils/sizeScaler";

const MODAL_WIDTH = 500;
const MODAL_HEIGHT = 300;

const SettingsModal = () => {
  const { height, width } = useWindowDimensions();
  const { nativeAppVersion, version, updateInfo } = useAppState();
  const { theme } = useContext(ThemeContext);
  const { hide, visible } = useSettingsModal();
  const [selectedTab, setSelectedTab] = useState("general");
  const { language } = useGenericPersistentState();

  const tabs = [
    { label: t("settings_general_tab_title"), type: "general" },
    { label: t("settings_appearance_and_lang_tab_title"), type: "appearance" },
  ];

  if (!visible) {
    return null;
  }

  const renderTab = () => {
    if (selectedTab === "general") return <General />;
    else if (selectedTab === "appearance") return <Appearance />;
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
          {updateInfo && updateInfo.version != version && (
            <Text
              style={{ marginBottom: sc(10) }}
              semibold
              size={2}
              onPress={() => shell.open(updateInfo?.download)}
              color={theme.primary}
            >
              {t("settings_new_update_available")}
            </Text>
          )}
          <Text size={2} color={theme.textPrimary}>
            {t("settings_credits_made_by")}{" "}
            <Text
              size={2}
              onPress={() => shell.open("https://open.mp/")}
              color={theme.primary}
            >
              open.mp
            </Text>{" "}
            |{" "}
            <Text
              size={2}
              onPress={() =>
                shell.open("https://github.com/openmultiplayer/launcher/")
              }
              color={theme.primary}
            >
              {t("settings_credits_view_source_on_github")}
            </Text>{" "}
            | v{nativeAppVersion} Build {version}
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
    height: 30,
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
  },
});

export default SettingsModal;

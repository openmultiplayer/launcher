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
            backgroundColor: theme.listHeaderBackgroundColor,
          },
        ]}
      >
        <TabBar
          list={tabs}
          onChange={(type) => setSelectedTab(type)}
          selected={selectedTab}
          style={{
            height: 30,
          }}
        />
        {renderTab()}
        <View style={styles.appInfoContainer}>
          {updateInfo && updateInfo.version != version && (
            <Text
              style={{ marginBottom: 10 }}
              semibold
              size={1}
              onPress={() => shell.open(updateInfo?.download)}
              color={theme.primary}
            >
              {t("settings_new_update_available")}
            </Text>
          )}
          <Text color={theme.textPrimary}>
            {t("settings_credits_made_by")}{" "}
            <Text
              onPress={() => shell.open("https://open.mp/")}
              color={theme.primary}
            >
              open.mp
            </Text>{" "}
            |{" "}
            <Text
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
            top: 5,
            right: 5,
            height: 25,
            width: 25,
          }}
          onPress={() => hide()}
        >
          <Icon
            image={images.icons.close}
            size={25}
            color={theme.primary}
            style={{ opacity: 0.5 }}
          />
        </TouchableOpacity>
      </View>
    </StaticModal>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4.65,
  },
  appInfoContainer: {
    height: 30,
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
  },
});

export default SettingsModal;

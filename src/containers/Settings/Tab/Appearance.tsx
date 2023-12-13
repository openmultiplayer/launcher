import { t } from "i18next";
import { useContext } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import CheckBox from "../../../components/CheckBox";
import Text from "../../../components/Text";
import { ThemeContext } from "../../../contexts/theme";
import { getLanguages } from "../../../locales";
import { useGenericPersistentState } from "../../../states/genericStates";
import { useSettingsModal } from "../../../states/settingsModal";
import { sc } from "../../../utils/sizeScaler";

const Appearance = () => {
  const { language, setLanguage } = useGenericPersistentState();
  const { theme } = useContext(ThemeContext);
  const { hide: hideSettings } = useSettingsModal();
  const languages = Object.entries(getLanguages());

  return (
    <View
      style={{
        paddingHorizontal: 12,
        overflow: "hidden",
        paddingTop: sc(6),
        paddingBottom: sc(12),
        flex: 1,
      }}
    >
      <Text semibold color={theme.textPrimary} size={2}>
        {t("settings_language_selector_title")}:
      </Text>
      <View
        style={{
          height: "100%",
          width: "100%",
          borderRadius: sc(10),
          marginTop: sc(10),
          padding: sc(16),
          backgroundColor: theme.itemBackgroundColor,
        }}
      >
        <ScrollView id="scroll">
          {languages.map(([_, lang], index) => {
            return (
              <Pressable
                key={"language-selector-" + lang.type}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: index === 0 ? 0 : sc(7),
                  marginBottom: index === languages.length - 1 ? 8 : 0,
                }}
                onPress={() => {
                  setLanguage(lang.type);
                  hideSettings();
                }}
              >
                <CheckBox
                  value={language === lang.type}
                  style={{ marginRight: sc(10) }}
                />
                <Text color={theme.textPrimary} size={2}>
                  {lang.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.pathInputContainer}></View>
    </View>
  );
};

const styles = StyleSheet.create({
  pathInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 7,
  },
  pathInput: {
    paddingHorizontal: 5,
    flex: 1,
    backgroundColor: "#FFFFFF",
    height: 29,
    borderRadius: 8,
    borderWidth: 2,
    outlineStyle: "none",
  },
  browseButton: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  importButton: {
    marginTop: 10,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  resetButton: {
    marginTop: 5,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  appInfoContainer: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
    alignItems: "center",
  },
});

export default Appearance;

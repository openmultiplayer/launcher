import { t } from "i18next";
import { useContext } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import CheckBox from "../../../components/CheckBox";
import Text from "../../../components/Text";
import { ThemeContext } from "../../../contexts/theme";
import { getLanguages } from "../../../locales";
import { useGenericPersistentState } from "../../../states/genericStates";
import { useSettingsModal } from "../../../states/settingsModal";

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
        paddingVertical: 10,
        flex: 1,
      }}
    >
      <Text size={1} color={theme.textPrimary}>
        {t("settings_language_selector_title")}:
      </Text>
      <View
        style={{
          height: "50%",
          width: "50%",
          borderRadius: 5,
          marginTop: 5,
          paddingLeft: 10,
          backgroundColor: theme.itemContainerBackgroundColor,
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
                  marginTop: index === 0 ? 8 : 3,
                  marginBottom: index === languages.length - 1 ? 8 : 0,
                }}
                onPress={() => {
                  setLanguage(lang.type);
                  hideSettings();
                }}
              >
                <CheckBox
                  value={language === lang.type}
                  style={{ marginRight: 5 }}
                />
                <Text size={1} color={theme.textPrimary}>
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

import { t } from "i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import CheckBox from "../../components/CheckBox";
import Text from "../../components/Text";
import { useGenericTempState } from "../../states/genericStates";
import { useTheme } from "../../states/theme";
import { languageFilters } from "../../utils/helpers";
import { sc } from "../../utils/sizeScaler";

const FiltersModal = () => {
  const { theme, themeType } = useTheme();
  const { showFilterMenu, searchData, setSearchData } = useGenericTempState();
  const { ompOnly, nonEmpty, unpassworded, languages } = searchData;

  return (
    <View style={styles.overlay}>
      <Pressable
        style={styles.backdrop}
        onPress={() => showFilterMenu(false)}
      />
      <View style={[styles.modal, { backgroundColor: theme.secondary }]}>
        <View>
          <Text semibold size={2} color={theme.textPrimary}>
            {t("filters")}:
          </Text>
          <Pressable
            style={styles.filterOption}
            onPress={() => setSearchData("ompOnly", !ompOnly)}
          >
            <CheckBox value={ompOnly} style={styles.checkbox} />
            <Text size={2} color={theme.textPrimary}>
              {t("filter_only_omp_servers")}
            </Text>
          </Pressable>
          <Pressable
            style={styles.filterOptionSecondary}
            onPress={() => setSearchData("nonEmpty", !nonEmpty)}
          >
            <CheckBox value={nonEmpty} style={styles.checkbox} />
            <Text size={2} color={theme.textPrimary}>
              {t("filter_non_empty_servers")}
            </Text>
          </Pressable>
          <Pressable
            style={styles.filterOptionSecondary}
            onPress={() => setSearchData("unpassworded", !unpassworded)}
          >
            <CheckBox value={unpassworded} style={styles.checkbox} />
            <Text size={2} color={theme.textPrimary}>
              {t("filter_unpassworded_servers")}
            </Text>
          </Pressable>
        </View>
        <View style={styles.languageSection}>
          <Text semibold size={2} color={theme.textPrimary}>
            {t("settings_lang_tab_title")}:
          </Text>
          <View
            style={[
              styles.languageList,
              { backgroundColor: theme.itemBackgroundColor },
            ]}
          >
            <ScrollView id={themeType === "dark" ? "scroll" : "scroll-light"}>
              {languageFilters.map((lang, index) => {
                const selected = languages.includes(lang.name);
                return (
                  <Pressable
                    key={"language-selector-" + lang.name}
                    style={[
                      styles.languageOption,
                      {
                        marginTop: index === 0 ? 0 : sc(7),
                        marginBottom:
                          index === languageFilters.length - 1 ? 8 : 0,
                      },
                    ]}
                    onPress={() => {
                      const updatedLanguages = selected
                        ? languages.filter((l) => l !== lang.name)
                        : [...languages, lang.name];

                      setSearchData("languages", updatedLanguages);
                    }}
                  >
                    <CheckBox
                      value={selected}
                      style={styles.languageCheckbox}
                    />
                    <Text color={theme.textPrimary} size={2}>
                      {lang.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "100%",
  },
  backdrop: {
    height: "100%",
    width: "100%",
    // @ts-ignore
    cursor: "default",
  },
  modal: {
    position: "absolute",
    flexDirection: "column",
    top: sc(46),
    left: 0,
    width: sc(250),
    height: sc(400),
    padding: sc(10),
    paddingBottom: sc(11),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.49,
    shadowRadius: 7.65,
    borderRadius: sc(6),
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: sc(10),
  },
  filterOptionSecondary: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: sc(6),
  },
  checkbox: {
    marginRight: sc(8),
  },
  languageSection: {
    flex: 1,
    width: "100%",
    marginTop: sc(10),
  },
  languageList: {
    paddingVertical: sc(4),
    paddingHorizontal: sc(6),
    borderRadius: sc(5),
    overflow: "hidden",
    marginTop: sc(6),
    flex: 1,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  languageCheckbox: {
    marginRight: sc(10),
  },
});

export default FiltersModal;

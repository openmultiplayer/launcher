import { t } from "i18next";
import { Pressable, ScrollView, View } from "react-native";
import CheckBox from "../../components/CheckBox";
import Text from "../../components/Text";
import { useGenericTempState } from "../../states/genericStates";
import { useTheme } from "../../states/theme";
import { sc } from "../../utils/sizeScaler";
import { languageFilters } from "../../utils/helpers";

const FiltersModal = () => {
  const { theme, themeType } = useTheme();
  const { showFilterMenu, searchData, setSearchData } = useGenericTempState();
  const { ompOnly, nonEmpty, unpassworded, languages } = searchData;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: "100%",
        width: "100%",
      }}
    >
      <Pressable
        style={{
          height: "100%",
          width: "100%", // @ts-ignore
          cursor: "default",
        }}
        onPress={() => showFilterMenu(false)}
      />
      <View
        style={{
          position: "absolute",
          flexDirection: "column",
          top: sc(46),
          left: 0,
          width: sc(250),
          height: sc(400),
          padding: sc(10),
          paddingBottom: sc(11),
          backgroundColor: theme.secondary,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.49,
          shadowRadius: 7.65,
          borderRadius: sc(6),
        }}
      >
        <View>
          <Text semibold size={2} color={theme.textPrimary}>
            {t("filters")}:
          </Text>
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: sc(10),
            }}
            onPress={() => setSearchData("ompOnly", !ompOnly)}
          >
            <CheckBox value={ompOnly} style={{ marginRight: sc(8) }} />
            <Text size={2} color={theme.textPrimary}>
              {t("filter_only_omp_servers")}
            </Text>
          </Pressable>
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: sc(6),
            }}
            onPress={() => setSearchData("nonEmpty", !nonEmpty)}
          >
            <CheckBox value={nonEmpty} style={{ marginRight: sc(8) }} />
            <Text size={2} color={theme.textPrimary}>
              {t("filter_non_empty_servers")}
            </Text>
          </Pressable>
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: sc(6),
            }}
            onPress={() => setSearchData("unpassworded", !unpassworded)}
          >
            <CheckBox value={unpassworded} style={{ marginRight: sc(8) }} />
            <Text size={2} color={theme.textPrimary}>
              {t("filter_unpassworded_servers")}
            </Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, width: "100%", marginTop: sc(10) }}>
          <Text semibold size={2} color={theme.textPrimary}>
            {t("settings_lang_tab_title")}:
          </Text>
          <View
            style={{
              paddingVertical: sc(4),
              paddingHorizontal: sc(6),
              borderRadius: sc(5),
              overflow: "hidden",
              marginTop: sc(6),
              flex: 1,
              backgroundColor: theme.itemBackgroundColor,
            }}
          >
            <ScrollView id={themeType === "dark" ? "scroll" : "scroll-light"}>
              {languageFilters.map((lang, index) => {
                const selected = languages.includes(lang.name);
                return (
                  <Pressable
                    key={"language-selector-" + lang.name}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: index === 0 ? 0 : sc(7),
                      marginBottom:
                        index === languageFilters.length - 1 ? 8 : 0,
                    }}
                    onPress={() => {
                      const cpy = [...languages];
                      if (selected) {
                        const findIndex = cpy.findIndex((l) => l === lang.name);
                        if (findIndex != -1) {
                          cpy.splice(findIndex, 1);
                        }
                      } else {
                        const findIndex = cpy.findIndex((l) => l === lang.name);
                        if (findIndex == -1) {
                          cpy.push(lang.name);
                        }
                      }

                      setSearchData("languages", cpy);
                    }}
                  >
                    <CheckBox
                      value={selected}
                      style={{ marginRight: sc(10) }}
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

export default FiltersModal;

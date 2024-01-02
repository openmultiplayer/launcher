import { t } from "i18next";
import { Pressable, View } from "react-native";
import CheckBox from "../../components/CheckBox";
import Text from "../../components/Text";
import { useGenericTempState } from "../../states/genericStates";
import { useTheme } from "../../states/theme";
import { sc } from "../../utils/sizeScaler";

const FiltersModal = () => {
  const { theme } = useTheme();
  const { showFilterMenu, searchData, setSearchData } = useGenericTempState();
  const { ompOnly, nonEmpty, unpassworded } = searchData;

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
          top: sc(40),
          left: 0,
          width: sc(250),
          padding: sc(10),
          paddingBottom: sc(11),
          backgroundColor: theme.secondary,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.29,
          shadowRadius: 4.65,
          borderRadius: 3,
        }}
      >
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
    </View>
  );
};

export default FiltersModal;

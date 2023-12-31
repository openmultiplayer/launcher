import { t } from "i18next";
import { StyleSheet, TextInput, View } from "react-native";
import Icon from "../components/Icon";
import TabBar from "../components/TabBar";
import { images } from "../constants/images";
import { useGenericTempState } from "../states/genericStates";
import { useSettings } from "../states/settings";
import { useTheme } from "../states/theme";
import { sc } from "../utils/sizeScaler";
import { ListType } from "../utils/types";

const NavBar = () => {
  const { theme } = useTheme();
  const { nickName, setNickName } = useSettings();
  const { setListType, listType } = useGenericTempState();

  const list: { icon: string; label: string; type: ListType }[] = [
    { icon: images.icons.favTab, label: t("favorites"), type: "favorites" },
    { icon: images.icons.internet, label: t("internet"), type: "internet" },
    { icon: images.icons.partner, label: t("partners"), type: "partners" },
    {
      icon: images.icons.recently,
      label: t("recently_joined"),
      type: "recentlyjoined",
    },
  ];

  return (
    <>
      <View style={styles.container}>
        <TabBar
          onChange={(type) => setListType(type as ListType)}
          list={list}
          selected={listType}
        />
        <View style={styles.inputs}>
          <View style={styles.nicknameContainer}>
            <View
              style={{
                height: sc(35),
                width: sc(35),
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: theme.itemBackgroundColor,
                borderRadius: sc(5),
              }}
            >
              <Icon
                title={t("nickname")}
                image={images.icons.nickname}
                size={sc(16)}
                color={theme.textSecondary}
              />
            </View>
            <TextInput
              value={nickName}
              onChangeText={(text) => setNickName(text)}
              placeholder={t("nickname") + "..."}
              placeholderTextColor={theme.textSecondary}
              style={{
                fontFamily: "Proxima Nova Regular",
                backgroundColor: theme.textInputBackgroundColor,
                color: theme.textPrimary,
                fontSize: sc(17),
                width: sc(160),
                marginLeft: sc(10),
                height: sc(35),
                paddingHorizontal: sc(5),
                borderRadius: sc(5),
                // @ts-ignore
                outlineStyle: "none",
              }}
            />
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 30,
    flexDirection: "row",
    zIndex: 50,
  },
  iconsContainer: {
    height: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    flexDirection: "row",
  },
  iconContainer: {
    height: "80%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inputs: {
    height: "100%",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  nicknameContainer: {
    height: sc(35),
    flexDirection: "row",
    alignItems: "center",
  },
  nicknameInput: {},
});

export default NavBar;

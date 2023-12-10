import { t } from "i18next";
import { useContext } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import Icon from "../components/Icon";
import TabBar from "../components/TabBar";
import { images } from "../constants/images";
import { ThemeContext } from "../contexts/theme";
import { useGenericTempState } from "../states/genericStates";
import { useSettings } from "../states/settings";
import { ListType } from "../utils/types";

const NavBar = () => {
  const { theme } = useContext(ThemeContext);
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
      <View style={[styles.container, { backgroundColor: theme.secondary }]}>
        <TabBar
          onChange={(type) => setListType(type as ListType)}
          list={list}
          selected={listType}
        />
        <View style={styles.inputs}>
          <View style={styles.nicknameContainer}>
            <Icon
              title={t("nickname")}
              image={images.icons.nickname}
              size={18}
              color={"white"}
            />
            <TextInput
              value={nickName}
              onChangeText={(text) => setNickName(text)}
              placeholder={t("nickname") + "..."}
              placeholderTextColor={theme.textPlaceholder}
              style={{
                backgroundColor: "white",
                color: theme.textSecondary,
                fontWeight: "600",
                fontSize: 12,
                width: 150,
                marginRight: 10,
                marginLeft: 10,
                height: "80%",
                paddingHorizontal: 5,
                borderColor: theme.primary,
                borderWidth: 1,
                borderRadius: 3,
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
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  nicknameInput: {},
});

export default NavBar;

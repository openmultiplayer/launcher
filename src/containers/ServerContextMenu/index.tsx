import { Clipboard } from "@react-native-clipboard/clipboard/dist/Clipboard.web";
import { t } from "i18next";
import { useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { useContextMenu } from "../../states/contextMenu";
import { usePersistentServers } from "../../states/servers";
import { useSettings } from "../../states/settings";
import { useTheme } from "../../states/theme";
import { startGame } from "../../utils/game";
import { sc } from "../../utils/sizeScaler";

const ContextMenu = () => {
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const { visible, position, server, hide } = useContextMenu();
  const { addToFavorites, removeFromFavorites, favorites } =
    usePersistentServers();
  const { nickName, gtasaPath } = useSettings();

  const [connectBtnBgCol, setConnectBtnBgCol] = useState(theme.secondary);
  const [favBtnBgCol, setFavBtnBgCol] = useState(theme.secondary);
  const [cpyBtnBgCol, setCpyBtnBgCol] = useState(theme.secondary);

  const favorited = useMemo(() => {
    const find = favorites.find(
      (fav) => server && fav.ip === server.ip && fav.port == server.port
    );
    return find !== undefined;
  }, [server, favorites]);

  const hideMenu = () => {
    setFavBtnBgCol(theme.secondary);
    setCpyBtnBgCol(theme.secondary);
    hide();
  };

  if (visible) {
    return (
      <View
        style={{
          position: "absolute",
          height: height,
          width: width,
          left: 0,
          zIndex: 60,
        }}
      >
        <Pressable
          style={{
            height: "100%",
            width: "100%", // @ts-ignore
            cursor: "default",
          }}
          onPress={() => hide()}
        />
        <View
          style={{
            position: "absolute",
            top: position.y - sc(60), // titlebar height is 25
            left: position.x,
            borderRadius: 4,
            backgroundColor: theme.secondary,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 3,
            },
            shadowOpacity: 0.8,
            shadowRadius: 4.65,
            justifyContent: "center",
            overflow: "hidden",
            // alignItems: "center",
          }}
        >
          <Pressable
            onHoverIn={() => setConnectBtnBgCol(theme.primary)}
            onHoverOut={() => setConnectBtnBgCol(theme.secondary)}
            onPress={() => {
              startGame(server, nickName, gtasaPath, "");
              hide();
            }}
            style={{
              backgroundColor: connectBtnBgCol,
              paddingLeft: 8,
              paddingRight: 30,
              paddingVertical: 7,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Icon
              style={{ marginRight: 3 }}
              image={images.icons.play}
              color={theme.primary}
              size={sc(23)}
            />
            <Text semibold size={1} color={theme.textPrimary}>
              {t("connect")}
            </Text>
          </Pressable>
          <Pressable
            onHoverIn={() => setFavBtnBgCol(theme.primary)}
            onHoverOut={() => setFavBtnBgCol(theme.secondary)}
            onPress={() => {
              if (favorited) {
                removeFromFavorites(server);
                hideMenu();
              } else {
                addToFavorites(server);
                hideMenu();
              }
            }}
            style={{
              backgroundColor: favBtnBgCol,
              paddingLeft: 10,
              paddingRight: 30,
              paddingVertical: 7,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Icon
              style={{ marginRight: 5 }}
              image={
                favorited ? images.icons.unfavorite : images.icons.favorite
              }
              size={sc(17)}
            />
            <Text semibold size={1} color={theme.textPrimary}>
              {favorited ? t("remove_from_favorites") : t("add_to_favorites")}
            </Text>
          </Pressable>
          <Pressable
            onHoverIn={() => setCpyBtnBgCol(theme.primary)}
            onHoverOut={() => setCpyBtnBgCol(theme.secondary)}
            onPress={() => {
              Clipboard.setString(`HostName: ${server.hostname}
Address: ${server.ip}:${server.port}
Players: ${server.playerCount} / ${server.maxPlayers}
Ping: ${server.ping}
Mode: ${server.gameMode}
Language: ${server.language}
Using open.mp: ${server.usingOmp ? "Yes" : "No"}`);
              hideMenu();
            }}
            style={{
              backgroundColor: cpyBtnBgCol,
              paddingLeft: 10,
              paddingRight: 30,
              paddingVertical: 7,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Icon
              style={{ marginRight: 5 }}
              image={images.icons.copy}
              size={sc(17)}
            />
            <Text semibold size={1} color={theme.textPrimary}>
              {t("copy_server_info")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  } else {
    return null;
  }
};

// const styles = StyleSheet.create({
//   app: {
//     // @ts-ignore
//     height: "100vh",
//     // @ts-ignore
//     width: "100vw",
//   },
// });

export default ContextMenu;

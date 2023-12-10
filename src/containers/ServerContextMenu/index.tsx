import { Clipboard } from "@react-native-clipboard/clipboard/dist/Clipboard.web";
import { t } from "i18next";
import { useContext, useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Icon from "../../components/Icon";
import Text from "../../components/Text";
import { images } from "../../constants/images";
import { useContextMenu } from "../../states/contextMenu";
import { usePersistentServers } from "../../states/servers";
import { useSettings } from "../../states/settings";
import { startGame } from "../../utils/helpers";
import { ThemeContext } from "./../../contexts/theme";

const ContextMenu = () => {
  const { width, height } = useWindowDimensions();
  const { theme } = useContext(ThemeContext);
  const { visible, position, server, hide } = useContextMenu();
  const { addToFavorites, removeFromFavorites, favorites } =
    usePersistentServers();
  const { nickName, gtasaPath } = useSettings();

  const [connectBtnBgCol, setConnectBtnBgCol] = useState(
    theme.listHeaderBackgroundColor
  );
  const [favBtnBgCol, setFavBtnBgCol] = useState(
    theme.listHeaderBackgroundColor
  );
  const [cpyBtnBgCol, setCpyBtnBgCol] = useState(
    theme.listHeaderBackgroundColor
  );

  const favorited = useMemo(() => {
    const find = favorites.find(
      (fav) => server && fav.ip === server.ip && fav.port == server.port
    );
    return find !== undefined;
  }, [server, favorites]);

  const hideMenu = () => {
    setFavBtnBgCol(theme.listHeaderBackgroundColor);
    setCpyBtnBgCol(theme.listHeaderBackgroundColor);
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
            top: position.y - 25, // titlebar height is 25
            left: position.x,
            borderRadius: 4,
            backgroundColor: theme.listHeaderBackgroundColor,
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
            onHoverIn={() =>
              setConnectBtnBgCol(theme.selectedItemBackgroundColor)
            }
            onHoverOut={() =>
              setConnectBtnBgCol(theme.listHeaderBackgroundColor)
            }
            onPress={() => {
              startGame(
                server,
                nickName,
                gtasaPath,
                `${gtasaPath}/samp.dll`,
                ""
              );
              hide();
            }}
            style={{
              backgroundColor: connectBtnBgCol,
              paddingLeft: 10,
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
              size={17}
            />
            <Text bold color={"#FFFFFF"}>
              {t("connect")}
            </Text>
          </Pressable>
          <Pressable
            onHoverIn={() => setFavBtnBgCol(theme.selectedItemBackgroundColor)}
            onHoverOut={() => setFavBtnBgCol(theme.listHeaderBackgroundColor)}
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
              size={14}
            />
            <Text bold color={"#FFFFFF"}>
              {favorited ? t("remove_from_favorites") : t("add_to_favorites")}
            </Text>
          </Pressable>
          <Pressable
            onHoverIn={() => setCpyBtnBgCol(theme.selectedItemBackgroundColor)}
            onHoverOut={() => setCpyBtnBgCol(theme.listHeaderBackgroundColor)}
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
              size={14}
            />
            <Text bold color={"#FFFFFF"}>
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

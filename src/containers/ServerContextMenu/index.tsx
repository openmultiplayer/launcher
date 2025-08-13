import { Clipboard } from "@react-native-clipboard/clipboard/dist/Clipboard.web";
import { t } from "i18next";
import { memo, useCallback, useMemo, useState } from "react";
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

const ContextMenu = memo(() => {
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
    if (!server) return false;
    return favorites.some(
      (fav) => fav.ip === server.ip && fav.port === server.port
    );
  }, [server, favorites]);

  const menuStyles = useMemo(
    () => ({
      overlay: {
        position: "absolute" as const,
        height: height,
        width: width,
        left: 0,
        zIndex: 60,
      },
      backdrop: {
        height: "100%",
        width: "100%",
        cursor: "default",
      },
      menu: {
        position: "absolute" as const,
        top: position.y - sc(60),
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
        justifyContent: "center" as const,
        overflow: "hidden" as const,
      },
    }),
    [height, width, position, theme, sc]
  );

  const getButtonStyle = (bgColor: string) => ({
    backgroundColor: bgColor,
    paddingLeft: connectBtnBgCol === bgColor ? 8 : 10,
    paddingRight: 30,
    paddingVertical: 7,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  });

  const hideMenu = useCallback(() => {
    setFavBtnBgCol(theme.secondary);
    setCpyBtnBgCol(theme.secondary);
    hide();
  }, [theme.secondary, hide]);

  const handleConnect = useCallback(() => {
    if (server) {
      startGame(server, nickName, gtasaPath, "");
      hide();
    }
  }, [server, nickName, gtasaPath, hide]);

  const handleFavoriteToggle = useCallback(() => {
    if (!server) return;

    if (favorited) {
      removeFromFavorites(server);
    } else {
      addToFavorites(server);
    }
    hideMenu();
  }, [server, favorited, removeFromFavorites, addToFavorites, hideMenu]);

  const handleCopyInfo = useCallback(() => {
    if (!server) return;

    const serverInfo = `HostName: ${server.hostname}
Address: ${server.ip}:${server.port}
Players: ${server.playerCount} / ${server.maxPlayers}
Ping: ${server.ping}
Mode: ${server.gameMode}
Language: ${server.language}
Using open.mp: ${server.usingOmp ? "Yes" : "No"}`;

    Clipboard.setString(serverInfo);
    hideMenu();
  }, [server, hideMenu]);

  if (!visible) {
    return null;
  }

  return (
    <View style={menuStyles.overlay}>
      <Pressable
        // @ts-ignore
        style={menuStyles.backdrop}
        onPress={hide}
      />
      <View style={menuStyles.menu}>
        <Pressable
          onHoverIn={() => setConnectBtnBgCol(theme.primary)}
          onHoverOut={() => setConnectBtnBgCol(theme.secondary)}
          onPress={handleConnect}
          style={getButtonStyle(connectBtnBgCol)}
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
          onPress={handleFavoriteToggle}
          style={getButtonStyle(favBtnBgCol)}
        >
          <Icon
            style={{ marginRight: 5 }}
            image={favorited ? images.icons.unfavorite : images.icons.favorite}
            size={sc(17)}
          />
          <Text semibold size={1} color={theme.textPrimary}>
            {favorited ? t("remove_from_favorites") : t("add_to_favorites")}
          </Text>
        </Pressable>
        <Pressable
          onHoverIn={() => setCpyBtnBgCol(theme.primary)}
          onHoverOut={() => setCpyBtnBgCol(theme.secondary)}
          onPress={handleCopyInfo}
          style={getButtonStyle(cpyBtnBgCol)}
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
});

ContextMenu.displayName = "ContextMenu";

export default ContextMenu;

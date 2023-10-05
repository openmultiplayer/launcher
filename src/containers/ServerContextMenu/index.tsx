import { useContext, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Text from "../../components/Text";
import { useContextMenu } from "../../states/contextMenu";
import { usePersistentServersStore } from "../../states/servers";
import { ThemeContext } from "./../../contexts/theme";
import Clipboard from "@react-native-clipboard/clipboard";

const ContextMenu = () => {
  const { width, height } = useWindowDimensions();
  const { theme } = useContext(ThemeContext);
  const { visible, position, server, hide } = useContextMenu();
  const { addToFavorites } = usePersistentServersStore();
  const [favBtnBgCol, setFavBtnBgCol] = useState(
    theme.listHeaderBackgroundColor
  );
  const [cpyBtnBgCol, setCpyBtnBgCol] = useState(
    theme.listHeaderBackgroundColor
  );

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
          top: 0,
          left: 0,
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
            top: position.y,
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
            onHoverIn={() => setFavBtnBgCol(theme.selectedItemBackgroundColor)}
            onHoverOut={() => setFavBtnBgCol(theme.listHeaderBackgroundColor)}
            onPress={() => {
              addToFavorites(server);
              hideMenu();
            }}
            style={{
              backgroundColor: favBtnBgCol,
              paddingLeft: 10,
              paddingRight: 30,
              paddingVertical: 7,
            }}
          >
            <Text bold color={"white"}>
              ❤️ Add to Favorites
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
            }}
          >
            <Text bold color={"white"}>
              📃 Copy Server Info
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

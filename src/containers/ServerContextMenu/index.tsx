import { useContext, useState } from "react";
import { Pressable, View } from "react-native";
import Text from "../../components/Text";
import { useContextMenu } from "../../states/contextMenu";
import { usePersistentServersStore } from "../../states/servers";
import { ThemeContext } from "./../../contexts/theme";

const ContextMenu = () => {
  const { theme } = useContext(ThemeContext);
  const { visible, position, server } = useContextMenu();
  const { addToFavorites } = usePersistentServersStore();
  const [favBtnBgCol, setFavBtnBgCol] = useState(
    theme.listHeaderBackgroundColor
  );

  if (visible) {
    return (
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
          onPress={() => addToFavorites(server)}
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

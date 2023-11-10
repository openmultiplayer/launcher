import { useContext, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Icon from "../components/Icon";
import Text from "../components/Text";
import { images } from "../constants/images";
import { ThemeContext } from "../contexts/theme";
import { useSettings } from "../states/settings";
import { ListType } from "../utils/types";

interface IProps {
  onListChange: (type: ListType) => void;
}

const NavBar = (props: IProps) => {
  const { theme } = useContext(ThemeContext);
  const [selectedList, setSelectedList] = useState<ListType>("favorites");
  const { nickName, setNickName } = useSettings();

  const list: { icon: string; label: string; type: ListType }[] = [
    { 
      icon: images.icons.favorite,
      label: "Favorites",
      type: "favorites"
    },
    {
      icon: images.icons.internet,
      label: "Internet",
      type: "internet"
    },
    {
      icon: images.icons.partner,
      label: "Partners",
      type: "partners"
    },
    {
      icon: images.icons.recently,
      label: "Recently Joined",
      type: "recentlyjoined",
    },
  ];

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.secondary }]}>
        <View style={styles.listing}>
          {list.map((item) => {
            const selected = selectedList === item.type;
            return (
              <View
                key={"list-type-" + item.type}
                style={{
                  overflow: "hidden",
                  height: 34,
                  top: 2,
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    selected
                      ? {
                          shadowColor: theme.primary,
                          shadowOffset: {
                            width: 0,
                            height: 0,
                          },
                          shadowOpacity: 0.45,
                          shadowRadius: 5.84,
                          borderColor: theme.textSelected,
                        }
                      : {},
                  ]}
                  onPress={() => {
                    if (selectedList !== item.type) {
                      setSelectedList(item.type);
                      props.onListChange(item.type);
                    }
                  }}
                >
                  <Icon
                    image={item.icon}
                    size={15}
                    style={{ marginRight: 5, opacity: selected ? 1 : 0.5 }}
                  />
                  <Text
                    semibold={selected}
                    size={1}
                    color={selected ? theme.textSelected : theme.textPrimary}
                    style={
                      selected
                        ? {
                            textShadowColor: "rgba(132, 119, 183, 0.5)",
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 4,
                          }
                        : {}
                    }
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
        <View style={styles.inputs}>
          <View style={styles.nicknameContainer}>
            <Icon
              title={"Nickname"}
              image={images.icons.nickname}
              size={18}
              color={"white"}
            />
            <TextInput
              value={nickName}
              onChangeText={(text) => setNickName(text)}
              placeholder="Nickname..."
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
  listing: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -0.5,
  },
  listItem: {
    height: 30,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
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

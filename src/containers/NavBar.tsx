import { shell } from "@tauri-apps/api";
import { useContext, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { appWindow } from "@tauri-apps/api/window";
import Icon from "../components/Icon";
import Text from "../components/Text";
import { images } from "../constants/images";
import { ThemeContext } from "../contexts/theme";
import { useSettingsStore } from "../states/settings";
import { useSettingsModal } from "../states/settingsModal";
import { ListType } from "../utils/types";
import { useAppState } from "../states/app";

interface IProps {
  onListChange: (type: ListType) => void;
}

const WindowTitleBarButtons = ({
  size = 25,
  image,
  onPress,
  iconSize = 15,
  title = "",
}: {
  size?: number;
  iconSize?: number;
  image: string;
  title?: string;
  onPress: () => void;
}) => {
  const { theme } = useContext(ThemeContext);
  return (
    // @ts-ignore
    <div class="titlebar-button" style={{ height: size, width: size + 5 }}>
      <Pressable
        style={{
          height: "100%",
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onPress}
      >
        <Icon
          title={title}
          image={image}
          size={iconSize}
          color={theme.textPrimary}
        />
      </Pressable>
    </div>
  );
};

const NavBar = (props: IProps) => {
  const { theme } = useContext(ThemeContext);
  const [selectedList, setSelectedList] = useState<ListType>("favorites");
  const { toggleMaximized } = useAppState();
  // const [showingDirectConnect, showDirectConnect] = useState(false);

  const { nickName, setNickName } = useSettingsStore();
  const { show: showSettings } = useSettingsModal();

  const list: { icon: string; label: string; type: ListType }[] = [
    { icon: images.icons.favorite, label: "Favorites", type: "favorites" },
    { icon: images.icons.internet, label: "Internet", type: "internet" },
    { icon: images.icons.partner, label: "Partners", type: "partners" },
    {
      icon: images.icons.recently,
      label: "Recently Joined",
      type: "recentlyjoined",
    },
  ];

  return (
    <>
      <div
        data-tauri-drag-region
        style={{
          height: 25,
          width: "100%",
          backgroundColor: theme.secondary,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={{ height: "100%" }}
          onPress={() => shell.open("https://open.mp/")}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              height: "100%",
              width: 130,
              paddingLeft: 2,
              top: 1,
            }}
          >
            <View style={styles.logoContainer}>
              <Icon image={images.icons.omp} size={20} />
            </View>
            <Text color={theme.textPrimary} style={{ top: -1, marginLeft: 3 }}>
              Open Multiplayer
            </Text>
          </View>
        </TouchableOpacity>
        <View
          style={{ flexDirection: "row", alignItems: "center", height: "100%" }}
        >
          <WindowTitleBarButtons
            title="Settings"
            iconSize={17}
            image={images.icons.settings}
            onPress={() => showSettings()}
          />
          <WindowTitleBarButtons
            title="Minimize"
            image={images.icons.windowMinimize}
            onPress={() => appWindow.minimize()}
          />
          <WindowTitleBarButtons
            title="Maximize"
            image={images.icons.windowMaximize}
            onPress={async () => {
              await appWindow.toggleMaximize();
              toggleMaximized(await appWindow.isMaximized());
            }}
          />
          <WindowTitleBarButtons
            title="Close"
            image={images.icons.windowClose}
            onPress={() => appWindow.close()}
          />
        </View>
      </div>
      <View
        style={[
          styles.container,
          // { backgroundColor: theme.secondary },
        ]}
      >
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
    backgroundColor: "#2D2D2D",
    zIndex: 1000,
  },
  logoContainer: {
    height: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    height: 22,
    width: 22,
    resizeMode: "stretch",
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

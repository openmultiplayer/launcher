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
// import DirectConnetOverlay from "./DirectConnetOverlay";
import { ThemeContext } from "../contexts/theme";
import { useSettingsStore } from "../states/settings";
import { useSettingsModal } from "../states/settingsModal";
import { ListType } from "../utils/types";
import { useAppState } from "../states/app";

interface IProps {
  onListChange: (type: ListType) => void;
}

const WindowTitleBarButtons = ({
  size,
  image,
  onPress,
}: {
  size: number;
  image: string;
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
        <Icon image={image} size={15} color={theme.textPrimary} />
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
      {/* <div data-tauri-drag-region class="titlebar">
        <div class="titlebar-button" id="titlebar-minimize">
          <img
            src="https://api.iconify.design/mdi:window-minimize.svg"
            alt="minimize"
          />
        </div>
        <div class="titlebar-button" id="titlebar-maximize">
          <img
            src="https://api.iconify.design/mdi:window-maximize.svg"
            alt="maximize"
          />
        </div>
        <div class="titlebar-button" id="titlebar-close">
          <img src="https://api.iconify.design/mdi:close.svg" alt="close" />
        </div>
      </div> */}
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
            }}
          >
            <View style={styles.logoContainer}>
              <Icon image={images.icons.omp} size={21} />
            </View>
            <Text
              semibold
              color={theme.textPrimary}
              style={{ top: -2, marginLeft: 3 }}
            >
              Open Multiplayer
            </Text>
          </View>
        </TouchableOpacity>
        <View
          style={{ flexDirection: "row", alignItems: "center", height: "100%" }}
        >
          <WindowTitleBarButtons
            size={25}
            image={images.icons.windowMinimize}
            onPress={() => appWindow.minimize()}
          />
          <WindowTitleBarButtons
            size={25}
            image={images.icons.windowMaximize}
            onPress={async () => {
              await appWindow.toggleMaximize();
              toggleMaximized(await appWindow.isMaximized());
            }}
          />
          <WindowTitleBarButtons
            size={25}
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
            return (
              <TouchableOpacity
                key={"list-type-" + item.type}
                style={[
                  styles.listItem,
                  selectedList === item.type
                    ? {
                        borderBottomWidth: 1,
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
                  style={{ marginHorizontal: 4 }}
                  image={item.icon}
                  size={18}
                />
                <Text
                  semibold
                  size={1}
                  color={
                    selectedList === item.type
                      ? theme.textSelected
                      : theme.textPrimary
                  }
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.inputs}>
          <View style={styles.nicknameContainer}>
            <Icon
              title={"Nickname"}
              image={images.icons.nickname}
              size={25}
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
                height: "55%",
                paddingHorizontal: 5,
                borderRadius: 3,
                // @ts-ignore
                outlineStyle: "none",
              }}
            />
          </View>
          {/* <Icon
            title="Direct Connect"
            image={images.icons.connect}
            size={25}
            onPress={() => showDirectConnect(!showingDirectConnect)}
            color={"white"}
          /> */}
        </View>
        <View style={styles.iconsContainer}>
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => showSettings()}
          >
            <Icon
              title="Settings"
              image={images.icons.settings}
              size={20}
              color={"white"}
            />
          </TouchableOpacity>
        </View>
      </View>
      {/* <DirectConnetOverlay
        visible={showingDirectConnect}
        onClose={() => showDirectConnect(!showingDirectConnect)}
      /> */}
      {/* <View style={{ position: 'absolute', top: 0, left: 0, height: 600, width: 400, backgroundColor: 'red' }} /> */}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 50,
    flexDirection: "row",
    backgroundColor: "#2D2D2D",
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
    height: "100%",
    paddingRight: 6,
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

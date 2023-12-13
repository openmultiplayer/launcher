import { t } from "i18next";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "../../../components/Icon";
import Text from "../../../components/Text";
import { images } from "../../../constants/images";
import { useAddThirdPartyServerModal } from "../../../states/addThirdPartyServerModal";
import {
  useGenericPersistentState,
  useGenericTempState,
} from "../../../states/genericStates";
import { useJoinServerPrompt } from "../../../states/joinServerPrompt";
import { usePersistentServers, useServers } from "../../../states/servers";
// import { fetchServers } from "../../../utils/helpers";
import { useTheme } from "../../../states/theme";
import { sc } from "../../../utils/sizeScaler";

interface IProps {
  onChange: (query: string) => void;
}

interface IActionIconProps {
  icon: string;
  onPress: () => void;
  buttonColor?: string;
  iconColor: string;
  iconSize: number;
  title: string;
  svg?: boolean;
}

// const AnimatedTouchableOpacity =
//   Animated.createAnimatedComponent(TouchableOpacity);

const ActionIcon = ({
  icon,
  onPress,
  buttonColor,
  iconColor,
  iconSize,
  title,
  svg,
}: IActionIconProps) => {
  return (
    <div
      style={{
        filter: buttonColor
          ? `drop-shadow(0 0 20px ${buttonColor}77)`
          : undefined,
      }}
    >
      <TouchableOpacity
        style={[styles.rightSideIcons, { backgroundColor: buttonColor }]}
        onPress={() => onPress()}
      >
        <Icon
          svg={svg}
          title={title}
          image={icon}
          size={iconSize}
          color={iconColor}
        />
      </TouchableOpacity>
    </div>
  );
};

const SearchBar = (props: IProps) => {
  const { theme } = useTheme();
  const { listType } = useGenericTempState();
  const [searchQuery, setSearchQuery] = useState("");
  const { filterMenu, showFilterMenu } = useGenericTempState();
  const { sideLists, showSideLists } = useGenericPersistentState();
  const { selected } = useServers();
  const {
    favorites,
    removeFromFavorites,
    addToFavorites,
    clearRecentlyJoined,
  } = usePersistentServers();
  const { showPrompt, setServer } = useJoinServerPrompt();
  const { showAddThirdPartyServer } = useAddThirdPartyServerModal();
  // const refreshIconSpinAnim = useRef(new Animated.Value(0)).current;

  const favorited = useMemo(() => {
    const find = favorites.find(
      (fav) => selected && fav.ip === selected.ip && fav.port == selected.port
    );
    return find !== undefined;
  }, [selected, favorites]);

  useEffect(() => {
    props.onChange(searchQuery);
  }, [searchQuery]);

  const playSelectedServer = () => {
    if (selected) {
      setServer(selected);
      showPrompt(true);
    }
  };

  // const refreshServers = async () => {
  //   const animation = Animated.timing(refreshIconSpinAnim, {
  //     toValue: 1,
  //     duration: 5000,
  //     useNativeDriver: false,
  //   });

  //   animation.start(() => {
  //     refreshIconSpinAnim.setValue(0);
  //   });

  //   fetchServers().finally(() => {
  //     setTimeout(() => {
  //       animation.stop();
  //       refreshIconSpinAnim.setValue(0);
  //     }, 1000);
  //   });
  // };

  // const interpolateRotating = refreshIconSpinAnim.interpolate({
  //   inputRange: [0, 1],
  //   outputRange: ["3600deg", "0deg"],
  // });

  return (
    <View style={styles.searchContainer}>
      <TouchableOpacity
        style={{
          height: sc(35),
          width: sc(35),
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.itemBackgroundColor,
          borderRadius: sc(5),
        }}
        onPress={() => showFilterMenu(!filterMenu)}
      >
        <Icon
          svg
          title={t("filter_servers")}
          image={images.icons.filter}
          size={sc(16)}
          color={theme.textSecondary}
        />
      </TouchableOpacity>
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.textInputBackgroundColor },
        ]}
      >
        <View
          style={{
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Icon
            svg
            image={images.icons.search}
            size={sc(16)}
            color={theme.textSecondary}
          />
        </View>
        <TextInput
          placeholder={t("search_for_server_hostname_mode")}
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          style={{
            height: "100%",
            backgroundColor: "transparent",
            flex: 1,
            fontFamily: "Proxima Nova Regular",
            fontSize: sc(17),
            paddingHorizontal: 5,
            color: theme.textPrimary,
            // @ts-ignore
            outlineStyle: "none",
          }}
          onChangeText={(text) => {
            setSearchQuery(text);
          }}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => {
              setSearchQuery("");
            }}
            style={{
              height: "100%",
              aspectRatio: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: theme.itemBackgroundColor,
            }}
          >
            <Text size={2} color={theme.textPlaceholder}>
              ✖
            </Text>
          </Pressable>
        )}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          width: 200,
          justifyContent: "flex-end",
        }}
      >
        {/* <AnimatedTouchableOpacity
          style={[
            styles.rightSideIcons,
            {
              transform: [
                {
                  rotate: interpolateRotating,
                },
              ],
            },
          ]}
          onPress={() => refreshServers()}
        >
          <Icon
            title={t("refresh_servers")}
            image={images.icons.refresh}
            size={20}
          />
        </AnimatedTouchableOpacity> */}
        {selected && (
          <>
            <ActionIcon
              title={t("play")}
              icon={images.icons.play}
              iconSize={sc(22)}
              iconColor={"#FFFFFF"}
              buttonColor={theme.primary}
              onPress={() => playSelectedServer()}
            />
            <ActionIcon
              title={
                favorited
                  ? t("remove_selected_server_from_favorites")
                  : t("add_selected_server_to_favorites")
              }
              icon={favorited ? images.icons.favRemove : images.icons.favAdd}
              iconSize={sc(20)}
              iconColor={"#FFFFFFDD"}
              buttonColor={"#C8302F"}
              onPress={() => {
                if (selected) {
                  if (favorited) {
                    removeFromFavorites(selected);
                  } else {
                    addToFavorites(selected);
                  }
                }
              }}
            />
          </>
        )}
        {listType === "recentlyjoined" && (
          <ActionIcon
            title={t("clear_recently_joined_list")}
            icon={images.icons.clean}
            iconSize={sc(20)}
            iconColor={"#78613F"}
            buttonColor={"#F1C17A"}
            onPress={() => clearRecentlyJoined()}
          />
        )}
        <ActionIcon
          svg
          title={t("add_server")}
          icon={images.icons.add}
          iconSize={sc(18)}
          iconColor={"#3B833D"}
          buttonColor={"#7AF1AA"}
          onPress={() => showAddThirdPartyServer(true)}
        />
        <ActionIcon
          title={
            sideLists
              ? t("hide_player_and_rule_list")
              : t("show_player_and_rule_list")
          }
          icon={
            sideLists ? images.icons.closeSideLists : images.icons.openSideLists
          }
          iconSize={sc(32)}
          iconColor={theme.textSecondary}
          onPress={() => showSideLists(!sideLists)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    height: sc(60),
    flexDirection: "row",
    alignItems: "center",
  },
  inputContainer: {
    height: sc(36),
    flex: 1,
    marginHorizontal: sc(10),
    paddingLeft: sc(10),
    flexDirection: "row",
    alignItems: "center",
    borderRadius: sc(5),
    overflow: "hidden",
  },
  rightSideIcons: {
    marginLeft: sc(10),
    height: sc(35),
    width: sc(35),
    borderRadius: sc(5),
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SearchBar;

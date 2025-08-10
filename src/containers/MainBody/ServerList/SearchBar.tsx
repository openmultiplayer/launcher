import { t } from "i18next";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { useTheme } from "../../../states/theme";
import { sc } from "../../../utils/sizeScaler";

interface SearchBarProps {
  onChange: (query: string) => void;
}

interface ActionIconProps {
  icon: string;
  onPress: () => void;
  buttonColor?: string;
  iconColor: string;
  iconSize: number;
  title: string;
  svg?: boolean;
}

const ActionIcon = memo<ActionIconProps>(
  ({ icon, onPress, buttonColor, iconColor, iconSize, title, svg }) => {
    const containerStyle = useMemo(
      () => ({
        filter: buttonColor
          ? `drop-shadow(0 0 20px ${buttonColor}44)`
          : undefined,
      }),
      [buttonColor]
    );

    const buttonStyle = useMemo(
      () => [styles.rightSideIcons, { backgroundColor: buttonColor }],
      [buttonColor]
    );

    return (
      <div style={containerStyle}>
        <TouchableOpacity style={buttonStyle} onPress={onPress}>
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
  }
);

const SearchBar = memo<SearchBarProps>(({ onChange }) => {
  const { theme, themeType } = useTheme();
  const { listType } = useGenericTempState();
  const [searchQuery, setSearchQuery] = useState("");
  const { filterMenu, showFilterMenu, searchData } = useGenericTempState();
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

  const showFiltersBadge = useMemo(() => {
    return (
      searchData.languages.length > 0 ||
      searchData.nonEmpty ||
      searchData.ompOnly ||
      searchData.unpassworded ||
      searchData.sortMode !== "none" ||
      searchData.sortName !== "none" ||
      searchData.sortPing !== "none" ||
      searchData.sortPlayer !== "none"
    );
  }, [searchData]);

  const favorited = useMemo(() => {
    if (!selected) return false;
    return favorites.some(
      (fav) => fav.ip === selected.ip && fav.port === selected.port
    );
  }, [selected, favorites]);

  useEffect(() => {
    onChange(searchQuery);
  }, [onChange, searchQuery]);

  const playSelectedServer = useCallback(() => {
    if (!selected) return;

    try {
      setServer(selected);
      showPrompt(true);
    } catch (error) {
      console.error("Error playing selected server:", error);
    }
  }, [selected, setServer, showPrompt]);

  const toggleFavorite = useCallback(() => {
    if (!selected) return;

    try {
      if (favorited) {
        removeFromFavorites(selected);
      } else {
        addToFavorites(selected);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }, [selected, favorited, removeFromFavorites, addToFavorites]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleFilterToggle = useCallback(() => {
    showFilterMenu(!filterMenu);
  }, [filterMenu, showFilterMenu]);

  const handleSideListsToggle = useCallback(() => {
    showSideLists(!sideLists);
  }, [sideLists, showSideLists]);

  const handleAddServer = useCallback(() => {
    showAddThirdPartyServer(true);
  }, [showAddThirdPartyServer]);

  const handleClearRecentlyJoined = useCallback(() => {
    try {
      clearRecentlyJoined();
    } catch (error) {
      console.error("Error clearing recently joined:", error);
    }
  }, [clearRecentlyJoined]);

  return (
    <View style={styles.searchContainer}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          { backgroundColor: theme.itemBackgroundColor },
        ]}
        onPress={handleFilterToggle}
      >
        <Icon
          svg
          title={t("filter_servers")}
          image={images.icons.filter}
          size={sc(16)}
          color={theme.textSecondary}
        />
        {showFiltersBadge ? (
          <div
            // @ts-ignore
            style={[
              styles.badgeContainer,
              {
                filter: `drop-shadow(0 0 5px ${theme.primary}${
                  themeType === "dark" ? "CC" : "FF"
                })`,
              },
            ]}
          >
            <View style={[styles.badge, { backgroundColor: theme.primary }]} />
          </div>
        ) : null}
      </TouchableOpacity>
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.textInputBackgroundColor },
        ]}
      >
        <View style={styles.searchIconContainer}>
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
          style={[styles.textInput, { color: theme.textPrimary }]}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={handleClearSearch}
            style={[
              styles.clearButton,
              { backgroundColor: theme.itemBackgroundColor },
            ]}
          >
            <Text size={2} color={theme.textPlaceholder}>
              ✖
            </Text>
          </Pressable>
        )}
      </View>
      <View style={styles.actionButtonsContainer}>
        {selected && (
          <>
            <ActionIcon
              title={t("play")}
              icon={images.icons.play}
              iconSize={sc(22)}
              iconColor={"#FFFFFF"}
              buttonColor={theme.primary}
              onPress={playSelectedServer}
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
              onPress={toggleFavorite}
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
            onPress={handleClearRecentlyJoined}
          />
        )}
        <ActionIcon
          svg
          title={t("add_server")}
          icon={images.icons.add}
          iconSize={sc(18)}
          iconColor={"#3B833D"}
          buttonColor={"#7AF1AA"}
          onPress={handleAddServer}
        />
        <ActionIcon
          svg
          title={
            sideLists
              ? t("hide_player_and_rule_list")
              : t("show_player_and_rule_list")
          }
          icon={
            sideLists ? images.icons.closeSideLists : images.icons.openSideLists
          }
          iconSize={sc(18)}
          iconColor={theme.textSecondary}
          buttonColor={theme.itemBackgroundColor}
          onPress={handleSideListsToggle}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  searchContainer: {
    height: sc(60),
    flexDirection: "row",
    alignItems: "center",
  },
  filterButton: {
    height: sc(35),
    width: sc(35),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: sc(5),
  },
  badgeContainer: {
    position: "absolute",
    bottom: -sc(2),
    right: -sc(3),
  },
  badge: {
    borderRadius: sc(30),
    height: sc(12),
    width: sc(12),
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
  searchIconContainer: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    height: "100%",
    backgroundColor: "transparent",
    flex: 1,
    fontFamily: "Proxima Nova Regular",
    fontSize: sc(17),
    paddingHorizontal: 5,
    // @ts-ignore
    outlineStyle: "none",
  },
  clearButton: {
    height: "100%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 200,
    justifyContent: "flex-end",
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

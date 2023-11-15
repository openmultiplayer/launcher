import { t } from "i18next";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "../../../components/Icon";
import Text from "../../../components/Text";
import { images } from "../../../constants/images";
import { ThemeContext } from "../../../contexts/theme";
import { useAddThirdPartyServerModal } from "../../../states/addThirdPartyServerModal";
import {
  useGenericPersistentState,
  useGenericTempState,
} from "../../../states/genericStates";
import { useJoinServerPrompt } from "../../../states/joinServerPrompt";
import { usePersistentServers, useServers } from "../../../states/servers";
import { fetchServers } from "../../../utils/helpers";

interface IProps {
  onChange: (query: string) => void;
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const SearchBar = (props: IProps) => {
  const { theme } = useContext(ThemeContext);
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
  const refreshIconSpinAnim = useRef(new Animated.Value(0)).current;

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

  const refreshServers = async () => {
    const animation = Animated.timing(refreshIconSpinAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    });

    animation.start(() => {
      refreshIconSpinAnim.setValue(0);
    });

    fetchServers().finally(() => {
      setTimeout(() => {
        animation.stop();
        refreshIconSpinAnim.setValue(0);
      }, 1000);
    });
  };

  const interpolateRotating = refreshIconSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["3600deg", "0deg"],
  });

  return (
    <View
      style={[styles.searchContainer, { backgroundColor: theme.secondary }]}
    >
      <TouchableOpacity
        style={{
          height: "100%",
          aspectRatio: 1.1,
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={() => showFilterMenu(!filterMenu)}
      >
        <Icon
          title={t("filter_servers")}
          image={images.icons.filter}
          size={16}
          color={theme.textPlaceholder}
        />
      </TouchableOpacity>
      <View
        style={{
          height: "100%",
          aspectRatio: 1,
          marginLeft: -5,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Icon image={images.icons.search} size={16} />
      </View>
      <View
        style={[
          styles.inputContainer,
          {
            borderBottomWidth: searchQuery.length ? 1 : 0,
            borderColor: theme.separatorBorderColor,
          },
        ]}
      >
        <TextInput
          placeholder={t("search_for_server_hostname_mode")}
          placeholderTextColor={theme.textPlaceholder}
          value={searchQuery}
          style={{
            height: "100%",
            backgroundColor: "transparent",
            flex: 1,
            paddingHorizontal: 5,
            // @ts-ignore
            outlineStyle: "none",
            color: theme.textPrimary,
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
              height: "80%",
              aspectRatio: 1,
              justifyContent: "center",
              alignItems: "center",
              marginTop: "1%",
              backgroundColor: theme.separatorBorderColor,
            }}
          >
            <Text size={2} color={theme.textPlaceholder}>
              ✖
            </Text>
          </Pressable>
        )}
      </View>
      {listType === "recentlyjoined" && (
        <TouchableOpacity
          style={styles.rightSideIcons}
          onPress={() => clearRecentlyJoined()}
        >
          <Icon
            title={t("clear_recently_joined_list")}
            image={images.icons.clean}
            size={18}
            color={"#D2691E"}
          />
        </TouchableOpacity>
      )}
      <AnimatedTouchableOpacity
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
      </AnimatedTouchableOpacity>
      <TouchableOpacity
        style={styles.rightSideIcons}
        onPress={() => playSelectedServer()}
      >
        <Icon
          title={t("play")}
          image={images.icons.play}
          size={22}
          color={theme.primary}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.rightSideIcons}
        onPress={() => {
          if (selected) {
            if (favorited) {
              removeFromFavorites(selected);
            } else {
              addToFavorites(selected);
            }
          }
        }}
      >
        <Icon
          title={
            favorited
              ? t("remove_selected_server_from_favorites")
              : t("add_selected_server_to_favorites")
          }
          image={favorited ? images.icons.unfavorite : images.icons.favorite}
          size={19}
          color={"#FF2D2D"}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.rightSideIcons}
        onPress={() => showAddThirdPartyServer(true)}
      >
        <Icon
          title={t("add_server")}
          image={images.icons.add}
          size={20}
          color={"#3B833D"}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.rightSideIcons,
          {
            opacity: 0.5,
            left: 5,
          },
        ]}
        onPress={() => showSideLists(!sideLists)}
      >
        <Icon
          title={
            sideLists
              ? t("hide_player_and_rule_list")
              : t("show_player_and_rule_list")
          }
          image={
            sideLists ? images.icons.closeSideLists : images.icons.openSideLists
          }
          size={20}
          color={theme.textPlaceholder}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
  inputContainer: {
    height: "100%",
    flex: 1,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  rightSideIcons: {
    height: "100%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SearchBar;

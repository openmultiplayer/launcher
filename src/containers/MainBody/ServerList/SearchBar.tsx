import { useContext, useEffect, useMemo, useState } from "react";
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
import { ThemeContext } from "../../../contexts/theme";
import { useAddThirdPartyServerModal } from "../../../states/addThirdPartyServerModal";
import {
  useGenericPersistentState,
  useGenericTempState,
} from "../../../states/genericStates";
import { usePasswordModal } from "../../../states/passwordModal";
import { usePersistentServersStore, useServers } from "../../../states/servers";
import { useSettings } from "../../../states/settings";
import { startGame } from "../../../utils/helpers";

interface IProps {
  onChange: (query: string) => void;
}

const SearchBar = (props: IProps) => {
  const { theme } = useContext(ThemeContext);

  const [searchQuery, setSearchQuery] = useState("");
  const { filterMenu, showFilterMenu } = useGenericTempState();
  const { sideLists, showSideLists } = useGenericPersistentState();
  const { selected } = useServers();
  const { favorites, removeFromFavorites, addToFavorites } =
    usePersistentServersStore();
  const { nickName, gtasaPath } = useSettings();
  const { showPasswordModal, setServerInfo } = usePasswordModal();
  const { showAddThirdPartyServer } = useAddThirdPartyServerModal();

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
      if (selected.hasPassword) {
        setServerInfo(selected.ip, selected.port);
        showPasswordModal(true);
      } else {
        startGame(
          nickName,
          selected.ip,
          selected.port,
          gtasaPath,
          `${gtasaPath}/samp.dll`,
          ""
        );
      }
    }
  };

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
          image={images.icons.filter}
          size={20}
          color={theme.textPlaceholder}
        />
      </TouchableOpacity>
      <View
        style={{
          height: "100%",
          aspectRatio: 1,
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
          placeholder="Search for server hostname/mode"
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
      <TouchableOpacity
        style={{
          height: "100%",
          aspectRatio: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={() => playSelectedServer()}
      >
        <Icon
          title={"Play"}
          image={images.icons.play}
          size={22}
          color={theme.primary}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          height: "100%",
          aspectRatio: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
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
              ? "Remove Selected Server from Favorites"
              : "Add Selected Server to Favorites"
          }
          image={favorited ? images.icons.favRemove : images.icons.favAdd}
          size={20}
          color={"#FF2D2D"}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          height: "100%",
          aspectRatio: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={() => showAddThirdPartyServer(true)}
      >
        <Icon
          title={"Add Your Server"}
          image={images.icons.add}
          size={20}
          color={"#3B833D"}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          height: "100%",
          aspectRatio: 1,
          opacity: 0.5,
          left: 5,
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={() => showSideLists(!sideLists)}
      >
        <Icon
          title={
            sideLists
              ? "Hide player and rule list"
              : "Show player and rule list"
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
});

export default SearchBar;

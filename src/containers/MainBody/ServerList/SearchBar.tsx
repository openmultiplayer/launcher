import { useContext, useEffect, useState } from "react";
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
import {
  useGenericPersistentState,
  useGenericTempState,
} from "../../../states/genericStates";

interface IProps {
  onChange: (query: string) => void;
}

const SearchBar = (props: IProps) => {
  const { theme } = useContext(ThemeContext);

  const [searchQuery, setSearchQuery] = useState("");
  const { filterMenu, showFilterMenu } = useGenericTempState();
  const { sideLists, showSideLists } = useGenericPersistentState();

  useEffect(() => {
    props.onChange(searchQuery);
  }, [searchQuery]);

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
          opacity: 0.5,
          left: 5,
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={() => showSideLists(!sideLists)}
      >
        <Icon
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

import { useContext, useState, useEffect } from "react";
import { StyleSheet, View, TextInput, Pressable } from "react-native";
import { ThemeContext } from "../../../contexts/theme";
import Icon from "../../../components/Icon";
import { images } from "../../../constants/images";
import Text from "../../../components/Text";
import CheckBox from "../../../components/CheckBox";

interface IProps {
  onChange: (query: string, ompOnly: boolean, nonEmpty: boolean) => void;
}

const SearchBar = (props: IProps) => {
  const { theme } = useContext(ThemeContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [ompOnly, setOmpOnly] = useState(false);
  const [nonEmpty, setNonEmpty] = useState(false);

  useEffect(() => {
    props.onChange(searchQuery, ompOnly, nonEmpty);
  }, [searchQuery, ompOnly, nonEmpty]);

  return (
    <View
      style={[styles.searchContainer, { backgroundColor: theme.secondary }]}
    >
      <View
        style={{
          height: "100%",
          aspectRatio: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Icon image={images.icons.search} size={20} />
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
            backgroundColor: theme.secondary,
            flex: 1,
            paddingLeft: 5,
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
      <View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <CheckBox
            value={ompOnly}
            onChange={(value) => setOmpOnly(value)}
            style={{ marginRight: 5 }}
          />
          <Text size={1} color={theme.textPrimary}>
            Only open.mp servers
          </Text>
        </View>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 1 }}
        >
          <CheckBox
            value={nonEmpty}
            onChange={(value) => setNonEmpty(value)}
            style={{ marginRight: 5 }}
          />
          <Text size={1} color={theme.textPrimary}>
            Non-empty Servers
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    height: 40,
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

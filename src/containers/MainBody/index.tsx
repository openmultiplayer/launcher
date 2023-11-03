import { useContext } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import CheckBox from "../../components/CheckBox";
import Text from "../../components/Text";
import { ThemeContext } from "../../contexts/theme";
import {
  useGenericPersistentState,
  useGenericTempState,
} from "../../states/genericStates";
import { ListType } from "../../utils/types";
import BottomBar from "./BottomBar";
import ServerInfo from "./ServerInfo";
import SearchBar from "./ServerList/SearchBar";
import Favorites from "./ServerList/Tabs/Favorites";
import Internet from "./ServerList/Tabs/Internet";
import Partners from "./ServerList/Tabs/Partners";
import RecentlyJoined from "./ServerList/Tabs/RecentlyJoined";

interface IProps {
  listType: ListType;
}

const FiltersModal = () => {
  const { theme } = useContext(ThemeContext);
  const { showFilterMenu, searchData, setSearchData } = useGenericTempState();
  const { ompOnly, nonEmpty, sortPlayer, sortPing } = searchData;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: "100%",
        width: "100%",
      }}
    >
      <Pressable
        style={{
          height: "100%",
          width: "100%", // @ts-ignore
          cursor: "default",
        }}
        onPress={() => showFilterMenu(false)}
      />
      <View
        style={{
          position: "absolute",
          top: 25,
          left: 6,
          width: 200,
          padding: 5,
          paddingBottom: 6,
          backgroundColor: theme.itemContainerBackgroundColor,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.29,
          shadowRadius: 4.65,
          borderRadius: 3,
        }}
      >
        <Text semibold size={1} color={theme.textPrimary}>
          Filters:
        </Text>
        <Pressable
          style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}
          onPress={() => setSearchData("ompOnly", !ompOnly)}
        >
          <CheckBox value={ompOnly} style={{ marginRight: 5 }} />
          <Text size={1} color={theme.textPrimary}>
            open.mp servers
          </Text>
        </Pressable>
        <Pressable
          style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}
          onPress={() => setSearchData("nonEmpty", !nonEmpty)}
        >
          <CheckBox value={nonEmpty} style={{ marginRight: 5 }} />
          <Text size={1} color={theme.textPrimary}>
            Non-empty Servers
          </Text>
        </Pressable>
        <Text
          semibold
          size={1}
          color={theme.textPrimary}
          style={{ marginTop: 7 }}
        >
          Sort By:
        </Text>
        <Pressable
          style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}
          onPress={() => {
            setSearchData("sortPing", "none");
            if (sortPlayer === "none") {
              setSearchData("sortPlayer", "descending");
            } else if (sortPlayer === "descending") {
              setSearchData("sortPlayer", "ascending");
            } else {
              setSearchData("sortPlayer", "none");
            }
          }}
        >
          <Text
            bold
            size={3}
            color={
              sortPlayer === "descending" ? theme.primary : theme.textPrimary
            }
          >
            ↓
          </Text>
          <Text
            bold
            size={3}
            color={
              sortPlayer === "ascending" ? theme.primary : theme.textPrimary
            }
          >
            ↑
          </Text>
          <Text size={1} color={theme.textPrimary} style={{ marginLeft: 5 }}>
            Players
          </Text>
        </Pressable>
        <Pressable
          style={{ flexDirection: "row", alignItems: "center", marginTop: 1 }}
          onPress={() => {
            setSearchData("sortPlayer", "none");
            if (sortPing === "none") {
              setSearchData("sortPing", "descending");
            } else if (sortPing === "descending") {
              setSearchData("sortPing", "ascending");
            } else {
              setSearchData("sortPing", "none");
            }
          }}
        >
          <Text
            bold
            size={3}
            color={
              sortPing === "descending" ? theme.primary : theme.textPrimary
            }
          >
            ↓
          </Text>
          <Text
            bold
            size={3}
            color={sortPing === "ascending" ? theme.primary : theme.textPrimary}
          >
            ↑
          </Text>
          <Text size={1} color={theme.textPrimary} style={{ marginLeft: 5 }}>
            Ping
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const MainView = (props: IProps) => {
  const { filterMenu, setSearchData } = useGenericTempState();
  const { sideLists } = useGenericPersistentState();

  const renderList = () => {
    if (props.listType === "favorites") return <Favorites />;
    else if (props.listType === "partners") return <Partners />;
    else if (props.listType === "internet") return <Internet />;
    else if (props.listType === "recentlyjoined") return <RecentlyJoined />;
  };

  return (
    <View style={styles.body}>
      <SearchBar
        listType={props.listType}
        onChange={(query) => setSearchData("query", query)}
      />
      <View style={styles.serverSection}>
        {renderList()}
        {sideLists && <ServerInfo />}
      </View>
      <BottomBar />
      {filterMenu && <FiltersModal />}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    width: "100%",
  },
  serverSection: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
  },
});

export default MainView;

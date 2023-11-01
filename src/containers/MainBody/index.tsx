import { useContext, useEffect, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import CheckBox from "../../components/CheckBox";
import Text from "../../components/Text";
import { ThemeContext } from "../../contexts/theme";
import {
  useGenericPersistentState,
  useGenericTempState,
} from "../../states/genericStates";
import { ListType, SearchData, SortType } from "../../utils/types";
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

interface FiltersModalProps {
  ompOnly: boolean;
  nonEmpty: boolean;
  sortPlayer: SortType;
  sortPing: SortType;
  onChange: (
    ompOnly: boolean,
    nonEmpty: boolean,
    sortPlayer: SortType,
    sortPing: SortType
  ) => void;
}

const FiltersModal = (props: FiltersModalProps) => {
  const { theme } = useContext(ThemeContext);

  const [ompOnly, setOmpOnly] = useState(props.ompOnly);
  const [nonEmpty, setNonEmpty] = useState(props.nonEmpty);
  const [sortPlayer, setSortPlayer] = useState(props.sortPlayer);
  const [sortPing, setSortPing] = useState(props.sortPing);

  useEffect(() => {
    if (props.onChange) {
      props.onChange(ompOnly, nonEmpty, sortPlayer, sortPing);
    }
  }, [ompOnly, nonEmpty, sortPlayer, sortPing]);

  return (
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
        onPress={() => setOmpOnly(!ompOnly)}
      >
        <CheckBox value={ompOnly} style={{ marginRight: 5 }} />
        <Text size={1} color={theme.textPrimary}>
          open.mp servers
        </Text>
      </Pressable>
      <Pressable
        style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}
        onPress={() => setNonEmpty(!nonEmpty)}
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
          setSortPing("none");
          if (sortPlayer === "none") {
            setSortPlayer("descending");
          } else if (sortPlayer === "descending") {
            setSortPlayer("ascending");
          } else {
            setSortPlayer("none");
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
          color={sortPlayer === "ascending" ? theme.primary : theme.textPrimary}
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
          setSortPlayer("none");
          if (sortPing === "none") {
            setSortPing("descending");
          } else if (sortPing === "descending") {
            setSortPing("ascending");
          } else {
            setSortPing("none");
          }
        }}
      >
        <Text
          bold
          size={3}
          color={sortPing === "descending" ? theme.primary : theme.textPrimary}
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
  );
};

const MainView = (props: IProps) => {
  const [searchData, setSearchData] = useState<SearchData>({
    query: "",
    nonEmpty: false,
    ompOnly: false,
    sortPing: "none",
    sortPlayer: "none",
  });

  const { filterMenu } = useGenericTempState();
  const { sideLists } = useGenericPersistentState();

  const renderList = () => {
    if (props.listType === "favorites")
      return <Favorites searchData={searchData} />;
    else if (props.listType === "partners")
      return <Partners searchData={searchData} />;
    else if (props.listType === "internet")
      return <Internet searchData={searchData} />;
    else if (props.listType === "recentlyjoined")
      return <RecentlyJoined searchData={searchData} />;
  };

  return (
    <View style={styles.body}>
      <SearchBar
        listType={props.listType}
        onChange={(query) => setSearchData({ ...searchData, query })}
      />
      <View style={styles.serverSection}>
        {renderList()}
        {sideLists && <ServerInfo />}
      </View>
      <BottomBar />
      {filterMenu && (
        <FiltersModal
          ompOnly={searchData.ompOnly}
          nonEmpty={searchData.nonEmpty}
          sortPing={searchData.sortPing}
          sortPlayer={searchData.sortPlayer}
          onChange={(ompOnly, nonEmpty, sortPlayer, sortPing) =>
            setSearchData({
              ...searchData,
              ompOnly,
              nonEmpty,
              sortPing,
              sortPlayer,
            })
          }
        />
      )}
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

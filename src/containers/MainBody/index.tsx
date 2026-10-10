import { memo, useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  useGenericPersistentState,
  useGenericTempState,
} from "../../states/genericStates";
import FiltersModal from "../FilterModal";
import BottomBar from "./BottomBar";
import ServerInfo from "./ServerInfo";
import SearchBar from "./ServerList/SearchBar";
import Favorites from "./ServerList/Tabs/Favorites";
import Internet from "./ServerList/Tabs/Internet";
import Partners from "./ServerList/Tabs/Partners";
import RecentlyJoined from "./ServerList/Tabs/RecentlyJoined";

const MainView = memo(() => {
  const { filterMenu, setSearchData } = useGenericTempState();
  const { sideLists } = useGenericPersistentState();
  const { listType } = useGenericTempState();

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchData("query", query);
    },
    [setSearchData]
  );

  const currentList = useMemo(() => {
    switch (listType) {
      case "favorites":
        return <Favorites />;
      case "partners":
        return <Partners />;
      case "internet":
        return <Internet />;
      case "recentlyjoined":
        return <RecentlyJoined />;
      default:
        return <Internet />;
    }
  }, [listType]);

  return (
    <View style={styles.body}>
      <SearchBar onChange={handleSearchChange} />
      <View style={styles.serverSection}>
        {currentList}
        {sideLists && <ServerInfo />}
      </View>
      <BottomBar />
      {filterMenu && <FiltersModal />}
    </View>
  );
});

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

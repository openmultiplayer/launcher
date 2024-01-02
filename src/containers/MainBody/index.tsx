import { StyleSheet, View } from "react-native";
import {
  useGenericPersistentState,
  useGenericTempState,
} from "../../states/genericStates";
import BottomBar from "./BottomBar";
import ServerInfo from "./ServerInfo";
import SearchBar from "./ServerList/SearchBar";
import Favorites from "./ServerList/Tabs/Favorites";
import Internet from "./ServerList/Tabs/Internet";
import Partners from "./ServerList/Tabs/Partners";
import RecentlyJoined from "./ServerList/Tabs/RecentlyJoined";
import FiltersModal from "../FilterModal";

const MainView = () => {
  const { filterMenu, setSearchData } = useGenericTempState();
  const { sideLists } = useGenericPersistentState();
  const { listType } = useGenericTempState();

  const renderList = () => {
    if (listType === "favorites") return <Favorites />;
    else if (listType === "partners") return <Partners />;
    else if (listType === "internet") return <Internet />;
    else if (listType === "recentlyjoined") return <RecentlyJoined />;
  };

  return (
    <View style={styles.body}>
      <SearchBar onChange={(query) => setSearchData("query", query)} />
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

import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ListType, SearchData } from "../../utils/types";
import ServerInfo from "./ServerInfo";
import SearchBar from "./ServerList/SearchBar";
import Favorites from "./ServerList/Tabs/Favorites";
import Internet from "./ServerList/Tabs/Internet";
import Partners from "./ServerList/Tabs/Partners";
import RecentlyJoined from "./ServerList/Tabs/RecentlyJoined";

interface IProps {
  listType: ListType;
}

const MainView = (props: IProps) => {
  const [searchData, setSearchData] = useState<SearchData>({
    query: "",
    nonEmpty: false,
    ompOnly: false,
  });

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
        onChange={(query, ompOnly, nonEmpty) => {
          setSearchData({ query, nonEmpty, ompOnly });
        }}
      />
      <View style={styles.serverSection}>
        {renderList()}
        <ServerInfo />
      </View>
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

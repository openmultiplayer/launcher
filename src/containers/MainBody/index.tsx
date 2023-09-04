import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SearchData, Server } from "../../utils/types";
import ServerList from "./ServerList/List";
import ServerInfo from "./ServerInfo";
import SearchBar from "./ServerList/SearchBar";
import { mockServers } from "../../utils/mocks";

const MainView = () => {
  const [selectedServer, setSelectedServer] = useState<Server | undefined>(
    undefined
  );
  const [searchData, setSearchData] = useState<SearchData>({
    query: "",
    nonEmpty: false,
    ompOnly: false,
  });

  return (
    <View style={styles.body}>
      <SearchBar
        onChange={(query, ompOnly, nonEmpty) => {
          setSearchData({ query, nonEmpty, ompOnly });
        }}
      />
      <View style={styles.serverSection}>
        <ServerList
          selectedServer={selectedServer}
          searchData={searchData}
          onServerSelect={(server) => setSelectedServer(server)}
          data={mockServers}
        />
        <ServerInfo server={selectedServer} />
      </View>
    </View>
  );
}

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

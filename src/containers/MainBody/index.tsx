import { useEffect, useState, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { ListType, SearchData, Server } from "../../utils/types";
import ServerList from "./ServerList/List";
import ServerInfo from "./ServerInfo";
import SearchBar from "./ServerList/SearchBar";
import { useFavServersStore, useTempServersStore } from "../../states/servers";
import { queryServer } from "../../utils/query";

interface IProps {
  listType: ListType;
}

const MainView = (props: IProps) => {
  const { internet, partners, setInternetList, setPartnersList } =
    useTempServersStore();
  const { favorites, setFavoritesList } = useFavServersStore();

  const queryTimer = useRef<number | undefined>(undefined);

  const [servers, setServerList] = useState<Server[]>(favorites);

  const [selectedServer, setSelectedServer] = useState<Server | undefined>(
    undefined
  );
  const mustIgnoreIndividualServerUpdate = useRef(false);

  const [searchData, setSearchData] = useState<SearchData>({
    query: "",
    nonEmpty: false,
    ompOnly: false,
  });

  useEffect(() => {
    if (props.listType === "favorites") {
      setServerList(favorites);
      onServerSelect(undefined);
    } else if (props.listType === "internet") {
      setServerList(internet);
      onServerSelect(undefined);
    } else if (props.listType === "partners") {
      setServerList(partners);
      onServerSelect(undefined);
    }
  }, [props.listType]);

  const onServerSelect = (server: Server | undefined) => {
    if (queryTimer.current != undefined) {
      clearInterval(queryTimer.current);
      mustIgnoreIndividualServerUpdate.current = true;
    }

    setSelectedServer(server);
    if (server) {
      getServerInfo(server.ip, server.port);
      queryTimer.current = setInterval(() => {
        getServerInfo(server.ip, server.port);
      }, 1000);
    }
  };

  const getServerInfo = (ip: string, port: number) => {
    queryServer(ip, port)
      .then((server) => {
        if (!mustIgnoreIndividualServerUpdate.current) {
          setSelectedServer(server);

          const list = [...servers];
          const index = list.findIndex(
            (srv) => srv.ip === server.ip && srv.port === server.port
          );
          if (index !== -1) {
            list[index] = { ...server };
          }
          setServerList(list);

          if (props.listType === "internet") setInternetList(list);
          else if (props.listType === "partners") setPartnersList(list);
          else if (props.listType === "favorites") setFavoritesList(list);
        } else {
          mustIgnoreIndividualServerUpdate.current = false;
        }
      })
      .catch((e) => console.log(e));
  };

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
          onServerSelect={(server) => onServerSelect(server)}
          data={servers}
        />
        <ServerInfo server={selectedServer} />
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

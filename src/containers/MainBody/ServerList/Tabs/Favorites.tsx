import { useContext, useEffect, useMemo } from "react";
import { useQuery } from "../../../../hooks/query";
import {
  usePersistentServersStore,
  useServers,
} from "../../../../states/servers";
import { SearchData, Server } from "../../../../utils/types";
import List from "../List";
import ServerItem from "./../Item";
import { TouchableOpacity, View } from "react-native";
import { ThemeContext } from "../../../../contexts/theme";
import Text from "../../../../components/Text";

interface IProps {
  searchData: SearchData;
}

const Favorites = (props: IProps) => {
  const { startQuery, stopQuery } = useQuery();
  const { favorites, updateInFavoritesList } = usePersistentServersStore();
  const { selected, setSelected } = useServers();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    return () => {
      stopQuery();
      setSelected(undefined);
    };
  }, []);

  useEffect(() => {
    if (selected) {
      updateInFavoritesList(selected);
    }
  }, [selected]);

  const list = useMemo(() => {
    const { ompOnly, nonEmpty, query } = props.searchData;
    const list = favorites.filter((server) => {
      const ompCheck = ompOnly ? server.usingOmp === true : true;
      const nonEmptyCheck = nonEmpty ? server.playerCount > 0 : true;

      return (
        server.ip &&
        ompCheck &&
        nonEmptyCheck &&
        server.hostname.toLowerCase().includes(query.toLowerCase())
      );
    });

    return list;
  }, [
    props.searchData.query,
    props.searchData.ompOnly,
    props.searchData.nonEmpty,
    favorites,
  ]);

  const onSelect = (server: Server) => {
    stopQuery();
    setSelected(server);
    startQuery(server);
  };

  return (
    <View style={{ flex: 1 }}>
      <List
        containerStyle={{ paddingBottom: 60 }}
        data={list}
        renderItem={(item, index) => (
          <ServerItem
            isSelected={
              selected
                ? selected.ip === item.ip && selected.port === item.port
                : false
            }
            server={item}
            index={index}
            onSelect={(server) => onSelect(server)}
          />
        )}
      />
      <div title="Add server to favorites">
        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: 15,
            right: 25,
            width: 40,
            height: 40,
            borderRadius: 100,
            backgroundColor: theme.primary,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text bold color="white" style={{ marginTop: -5, fontSize: 26 }}>
            +
          </Text>
        </TouchableOpacity>
      </div>
    </View>
  );
};

export default Favorites;

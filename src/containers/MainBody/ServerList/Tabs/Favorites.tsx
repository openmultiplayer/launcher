import { useEffect, useMemo } from "react";
import { useQuery } from "../../../../hooks/query";
import { useGenericTempState } from "../../../../states/genericStates";
import {
  usePersistentServers,
  useServers,
} from "../../../../states/servers";
import { Server } from "../../../../utils/types";
import List from "../List";
import ServerItem from "./../Item";
import { sortAndSearchInServerList } from "../../../../utils/helpers";

const Favorites = () => {
  const { startQuery, stopQuery } = useQuery();
  const { favorites, updateInFavoritesList } = usePersistentServers();
  const { selected, setSelected } = useServers();
  const { searchData } = useGenericTempState();

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
    return sortAndSearchInServerList(favorites, searchData);
  }, [
    searchData.query,
    searchData.ompOnly,
    searchData.nonEmpty,
    searchData.sortPing,
    searchData.sortPlayer,
    searchData.sortName,
    searchData.sortMode,
    favorites,
  ]);

  const onSelect = (server: Server) => {
    stopQuery();
    setSelected(server);
    startQuery(server);
  };

  return (
    <List
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
  );
};

export default Favorites;

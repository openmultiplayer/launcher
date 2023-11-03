import { useEffect, useMemo } from "react";
import { useQuery } from "../../../../hooks/query";
import { useGenericTempState } from "../../../../states/genericStates";
import {
  usePersistentServersStore,
  useServers,
} from "../../../../states/servers";
import { Server } from "../../../../utils/types";
import List from "../List";
import ServerItem from "./../Item";

const Favorites = () => {
  const { startQuery, stopQuery } = useQuery();
  const { favorites, updateInFavoritesList } = usePersistentServersStore();
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
    const { ompOnly, nonEmpty, query, sortPing, sortPlayer } = searchData;
    let list = favorites.filter((server) => {
      const ompCheck = ompOnly ? server.usingOmp === true : true;
      const nonEmptyCheck = nonEmpty ? server.playerCount > 0 : true;

      return (
        server.ip &&
        ompCheck &&
        nonEmptyCheck &&
        server.hostname.toLowerCase().includes(query.toLowerCase())
      );
    });

    if (sortPing !== "none") {
      list = list.sort((a, b) => {
        if (sortPing === "descending") {
          return a.ping - b.ping;
        } else {
          return b.ping - a.ping;
        }
      });
    }

    if (sortPlayer !== "none") {
      list = list.sort((a, b) => {
        if (sortPlayer === "descending") {
          return a.playerCount - b.playerCount;
        } else {
          return b.playerCount - a.playerCount;
        }
      });
    }

    return list;
  }, [
    searchData.query,
    searchData.ompOnly,
    searchData.nonEmpty,
    searchData.sortPing,
    searchData.sortPlayer,
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

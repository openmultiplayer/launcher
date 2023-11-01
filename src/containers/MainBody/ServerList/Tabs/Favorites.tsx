import { useEffect, useMemo } from "react";
import { useQuery } from "../../../../hooks/query";
import {
  usePersistentServersStore,
  useServers,
} from "../../../../states/servers";
import { SearchData, Server } from "../../../../utils/types";
import List from "../List";
import ServerItem from "./../Item";

interface IProps {
  searchData: SearchData;
}

const Favorites = (props: IProps) => {
  const { startQuery, stopQuery } = useQuery();
  const { favorites, updateInFavoritesList } = usePersistentServersStore();
  const { selected, setSelected } = useServers();

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
    const { ompOnly, nonEmpty, query, sortPing, sortPlayer } = props.searchData;
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
    props.searchData.query,
    props.searchData.ompOnly,
    props.searchData.nonEmpty,
    props.searchData.sortPing,
    props.searchData.sortPlayer,
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

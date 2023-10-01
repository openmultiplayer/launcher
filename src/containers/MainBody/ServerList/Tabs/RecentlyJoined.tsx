import { useEffect, useMemo } from "react";
import { useQuery } from "../../../../hooks/query";
import {
  usePersistentServersStore,
  useTempServersStore,
} from "../../../../states/servers";
import { SearchData, Server } from "../../../../utils/types";
import List from "../List";
import ServerItem from "./../Item";

interface IProps {
  searchData: SearchData;
}

const RecentlyJoined = (props: IProps) => {
  const { startQuery, stopQuery } = useQuery();
  const { selected, servers, setSelected } = useTempServersStore();
  const { recentlyJoined } = usePersistentServersStore();

  useEffect(() => {
    return () => {
      stopQuery();
      setSelected(undefined);
    };
  }, []);

  const list = useMemo(() => {
    const { ompOnly, nonEmpty, query } = props.searchData;
    const list = servers.filter((server) => {
      const existsInRecentlyJoined = recentlyJoined.includes(
        `${server.ip}:${server.port}`
      );
      const ompCheck = ompOnly ? server.usingOmp === true : true;
      const nonEmptyCheck = nonEmpty ? server.playerCount > 0 : true;

      return (
        existsInRecentlyJoined &&
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
    servers,
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

export default RecentlyJoined;

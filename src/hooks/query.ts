import { useEffect, useRef } from "react";
import { useServers } from "../states/servers";
import { queryServer } from "../utils/query";
import { ListType, Server } from "../utils/types";

const QUERY_INTERVAL_DELAY_MS = 1000;

export const useQuery = () => {
  const queryTimer = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  const { selected, setSelected } = useServers();
  const selectedServer = useRef<Server | undefined>(selected);

  useEffect(() => {
    selectedServer.current = selected;
  }, [selected]);

  const stopQuery = () => {
    if (queryTimer.current != undefined) {
      clearInterval(queryTimer.current);
      queryTimer.current = undefined;
      setSelected(undefined);
      selectedServer.current = undefined;
    }
  };

  const startQuery = (srv: Server, listType: ListType) => {
    if (queryTimer.current != undefined) {
      clearInterval(queryTimer.current);
      queryTimer.current = undefined;
    } else {
      getServerInfo(srv, listType);
      queryTimer.current = setInterval(() => {
        getServerInfo(srv, listType);
      }, QUERY_INTERVAL_DELAY_MS);
    }
  };

  const getServerInfo = (srv: Server, listType: ListType) => {
    queryServer(srv, listType);
  };

  return {
    startQuery,
    stopQuery,
  };
};

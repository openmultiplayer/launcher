import { useCallback, useEffect, useRef } from "react";
import { useServers } from "../states/servers";
import { queryServer } from "../utils/query";
import { ListType, Server } from "../utils/types";

const QUERY_INTERVAL_DELAY_MS = 1000;
const QUERY_TIMES_TO_GET_INFO_THRESHOLD = 5;

export const useQuery = () => {
  const queryTimer = useRef<NodeJS.Timeout | null>(null);
  const { selected, setSelected } = useServers();
  const selectedServer = useRef<Server | undefined>(selected);
  const queryTimesToGetInfo = useRef<number>(0);

  useEffect(() => {
    selectedServer.current = selected;
  }, [selected]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (queryTimer.current) {
        clearInterval(queryTimer.current);
        queryTimer.current = null;
      }
    };
  }, []);

  const stopQuery = useCallback(() => {
    if (queryTimer.current) {
      clearInterval(queryTimer.current);
      queryTimer.current = null;
      setSelected(undefined);
      selectedServer.current = undefined;
    }
  }, [setSelected]);

  const getServerInfo = useCallback((srv: Server, listType: ListType) => {
    const shouldGetFullInfo =
      queryTimesToGetInfo.current !== QUERY_TIMES_TO_GET_INFO_THRESHOLD;

    queryServer(srv, listType, "all", shouldGetFullInfo);

    if (shouldGetFullInfo) {
      queryTimesToGetInfo.current++;
    } else {
      queryTimesToGetInfo.current = 0;
    }
  }, []);

  const startQuery = useCallback(
    (srv: Server, listType: ListType) => {
      // Clear any existing query
      if (queryTimer.current) {
        clearInterval(queryTimer.current);
        queryTimer.current = null;
      }

      // Start new query cycle
      queryTimesToGetInfo.current = QUERY_TIMES_TO_GET_INFO_THRESHOLD;
      getServerInfo(srv, listType);

      queryTimer.current = setInterval(() => {
        getServerInfo(srv, listType);
      }, QUERY_INTERVAL_DELAY_MS);
    },
    [getServerInfo]
  );

  return {
    startQuery,
    stopQuery,
  };
};

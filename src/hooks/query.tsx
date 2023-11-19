import { useEffect, useRef } from "react";
import { useServers } from "../states/servers";
import { queryServer } from "../utils/query";
import { Server } from "../utils/types";

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

  const startQuery = (srv: Server) => {
    if (queryTimer.current != undefined) {
      clearInterval(queryTimer.current);
      queryTimer.current = undefined;
    } else {
      getServerInfo(srv);
      queryTimer.current = setInterval(() => {
        getServerInfo(srv);
      }, 1000);
    }
  };

  const getServerInfo = (srv: Server) => {
    queryServer(srv);
  };

  return {
    startQuery,
    stopQuery,
  };
};

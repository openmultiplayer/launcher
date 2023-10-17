import { useEffect, useRef } from "react";
import { useServers } from "../states/servers";
import { queryServer } from "../utils/query";
import { Server } from "../utils/types";

export const useQuery = () => {
  const queryTimer = useRef<number | undefined>(undefined);

  const { selected, updateServer, setSelected } = useServers();
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
    queryServer(srv)
      .then((server) => {
        if (server && selectedServer.current) {
          if (
            server.ip == selectedServer.current.ip &&
            server.port == selectedServer.current.port
          ) {
            updateServer(server);
            setSelected(server);
          }
        }
      })
      .catch((e) => console.log(e));
  };

  return {
    startQuery,
    stopQuery,
  };
};

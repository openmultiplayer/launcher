import { useEffect, useRef, useState } from "react";
import { useTempServersStore } from "../states/servers";
import { queryServer } from "../utils/query";
import { Server } from "../utils/types";

export const useQuery = () => {
  const queryTimer = useRef<number | undefined>(undefined);

  const { selected, updateServer, setSelected } = useTempServersStore();
  const selectedServer = useRef<Server | undefined>(selected);

  useEffect(() => {
    selectedServer.current = selected;
  }, [selected]);

  const [server, setServer] = useState<undefined | Server>(undefined);

  const stopQuery = () => {
    if (queryTimer.current != undefined) {
      clearInterval(queryTimer.current);
      queryTimer.current = undefined;
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
    console.log("querying", srv.ip + ":" + srv.port);
    queryServer(srv)
      .then((server) => {
        console.log("query response", server);
        if (server && selectedServer.current) {
          if (
            server.ip == selectedServer.current.ip &&
            server.port == selectedServer.current.port
          ) {
            console.log("setting server info");
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

import api from "../api/config";
import { mapAPIResponseServerListToAppStructure } from "../utils/helpers";
import { APIResponseServer, Server } from "../utils/types";

export const getCachedInternetList = async () => {
  return new Promise<{ success: boolean; servers: Server[] }>((resolve, _) => {
    api
      .get("/servers")
      .then((response) => {
        const list: APIResponseServer[] = response.data;
        if (Array.isArray(list)) {
          const restructuredList = mapAPIResponseServerListToAppStructure(list);
          resolve({ success: true, servers: restructuredList });
        }
      })
      .catch((e) => {
        console.log(e);
        resolve({ success: false, servers: [] });
      });
  });
};

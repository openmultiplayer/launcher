import api from "../api/config";
import { Server } from "../utils/types";

export const getCachedInternetList = async () => {
  return new Promise<{ success: boolean; servers: Server[] }>((resolve, _) => {
    api
      .get("/servers")
      .then((response) => {
        const list = response.data;
        if (Array.isArray(list)) {
          resolve({ success: true, servers: list });
        }
      })
      .catch((e) => {
        console.log(e);
        resolve({ success: false, servers: [] });
      });
  });
};

import api from "../api/config";
import { UpdateInfo } from "../states/appInfo";
import { mapAPIResponseServerListToAppStructure } from "../utils/helpers";
import { APIResponseServer, Server } from "../utils/types";

export const getCachedList = async () => {
  return new Promise<{ success: boolean; servers: Server[] }>((resolve, _) => {
    api
      .get("/servers/full")
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

export const getUpdateInfo = async () => {
  return new Promise<{ success: boolean; info: UpdateInfo | undefined }>(
    (resolve, _) => {
      api
        .get("/launcher")
        .then((response) => {
          resolve({ success: true, info: response.data });
        })
        .catch((e) => {
          console.log(e);
          resolve({ success: false, info: undefined });
        });
    }
  );
};

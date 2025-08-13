import api from "../api/config";
import { UpdateInfo } from "../states/app";
import { mapAPIResponseServerListToAppStructure } from "../utils/helpers";
import { Log } from "../utils/logger";
import { APIResponseServer, Server } from "../utils/types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export const getCachedList = async (): Promise<ApiResponse<Server[]>> => {
  try {
    const response = await api.get<APIResponseServer[]>("/servers/full");

    if (!Array.isArray(response.data)) {
      Log.debug("Invalid API response: expected array");
      return { success: false, data: [], error: "Invalid response format" };
    }

    const restructuredList = mapAPIResponseServerListToAppStructure(
      response.data
    );

    // Update server store with the fetched data
    const { useServers } = await import("../states/servers");
    useServers.getState().setServers(restructuredList);

    return { success: true, data: restructuredList };
  } catch (error) {
    Log.debug("Failed to fetch server list:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getUpdateInfo = async (): Promise<
  ApiResponse<UpdateInfo | undefined>
> => {
  try {
    const response = await api.get<UpdateInfo>("/launcher");
    return { success: true, data: response.data };
  } catch (error) {
    Log.debug("Failed to fetch update info:", error);
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

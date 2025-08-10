import { Log } from "../utils/logger";

const RPC_ENDPOINT = "http://127.0.0.1:46290";
const RPC_TIMEOUT = 30000; // 30 seconds

interface RpcResponse<T = string> {
  success: boolean;
  data: T;
  error?: string;
}

const createRpcRequest = async (
  endpoint: string,
  method: string,
  params: object
): Promise<RpcResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT);

  try {
    const response = await fetch(`${RPC_ENDPOINT}/${endpoint}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ params }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorMsg = `RPC request failed with status ${response.status}`;
      Log.debug(errorMsg);
      return { success: false, data: "", error: errorMsg };
    }

    const text = await response.text();
    return { success: true, data: text };
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMsg =
      error instanceof Error ? error.message : "Unknown RPC error";
    Log.debug("RPC request failed:", errorMsg);
    return { success: false, data: "", error: errorMsg };
  }
};

export const invokeRpc = async (
  method: string,
  params: object
): Promise<RpcResponse> => {
  return createRpcRequest("rpc", method, params);
};

export const invokeSyncRpc = async (
  method: string,
  params: object
): Promise<RpcResponse> => {
  return createRpcRequest("sync_rpc", method, params);
};

// Legacy exports for backward compatibility
export const invoke_rpc = async (
  method: string,
  params: object
): Promise<string> => {
  const result = await invokeRpc(method, params);
  return result.data;
};

export const invoke_sync_rpc = async (
  method: string,
  params: object
): Promise<string> => {
  const result = await invokeSyncRpc(method, params);
  return result.data;
};

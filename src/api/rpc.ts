import { Log } from "../utils/logger";

const RPC_ENDPOINT = "http://127.0.0.1:46290";

export const invoke_rpc = async (method: string, params: object) => {
  const response = await fetch(`${RPC_ENDPOINT}/rpc/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      params: params,
    }),
  });

  if (!response.ok) {
    Log.debug(`RPC request failed with status ${response.status}`);
  }

  const text = await response.text();
  return text;
};

export const invoke_sync_rpc = async (method: string, params: object) => {
  const response = await fetch(`${RPC_ENDPOINT}/sync_rpc/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      params: params,
    }),
  });

  if (!response.ok) {
    Log.debug(`RPC request failed with status ${response.status}`);
  }

  const text = await response.text();
  return text;
};

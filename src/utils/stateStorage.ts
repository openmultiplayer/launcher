// import { invoke_sync_rpc } from "../api/rpc";

// class NativeStorage {
//   async getItem(key: string) {
//     try {
//       const value = await invoke_sync_rpc("storage_get_item", { key });
//       if (value.startsWith("storage_error|sep|")) {
//         console.error(
//           "Error getting item from storage:",
//           value.replace("storage_error|sep|", "")
//         );
//         return null;
//       }
//       return value === "null" ? null : value;
//     } catch (error) {
//       console.error("Error getting item from storage:", error);
//       return null;
//     }
//   }

//   async setItem(key: string, value: string) {
//     try {
//       const result = await invoke_sync_rpc("storage_set_item", { key, value });
//       if (result.startsWith("storage_error|sep|")) {
//         console.error(
//           "Error setting item from storage:",
//           result.replace("storage_error|sep|", "")
//         );
//         return;
//       }
//     } catch (error) {
//       console.error("Error setting item in storage:", error);
//     }
//   }

//   async removeItem(key: string) {
//     try {
//       const result = await invoke_sync_rpc("storage_remove_item", { key });
//       if (result.startsWith("storage_error|sep|")) {
//         console.error(
//           "Error removing item from storage:",
//           result.replace("storage_error|sep|", "")
//         );
//         return;
//       }
//     } catch (error) {
//       console.error("Error removing item from storage:", error);
//     }
//   }

//   async getAllItems(): Promise<Record<string, string>> {
//     try {
//       const items = await invoke_sync_rpc("storage_get_all_items", {});
//       if (items.startsWith("storage_error|sep|")) {
//         console.error(
//           "Error getting all items from storage:",
//           items.replace("storage_error|sep|", "")
//         );
//         return {};
//       }
//       return JSON.parse(items);
//     } catch (error) {
//       console.error("Error getting all items from storage:", error);
//       return {};
//     }
//   }

//   async clear() {
//     try {
//       const result = await invoke_sync_rpc("storage_clear", {});
//       if (result.startsWith("storage_error|sep|")) {
//         console.error(
//           "Error clearing all from storage:",
//           result.replace("storage_error|sep|", "")
//         );
//         return null;
//       }
//     } catch (error) {
//       console.error("Error clearing all items from storage:", error);
//     }
//   }
// }

// // @ts-ignore
// const nativeStorage = new NativeStorage();

// export const stateStorage: any = {
//   getItem: async (key: string) => {
//     return await nativeStorage.getItem(key);
//   },
//   setItem: async (key: string, value: string) => {
//     await nativeStorage.setItem(key, value);
//   },
//   removeItem: async (key: string) => {
//     await nativeStorage.removeItem(key);
//   },
//   clear: async () => {
//     await nativeStorage.clear();
//   },
// };

export const stateStorage = localStorage;

import { invoke } from "@tauri-apps/api/tauri";

class NativeStorage {
  async getItem(key: string) {
    try {
      const value = await invoke<string | null>("get_item", { key });
      return value;
    } catch (error) {
      console.error("Error getting item from storage:", error);
      return null;
    }
  }

  async setItem(key: string, value: string) {
    try {
      await invoke("set_item", { key, value });
    } catch (error) {
      console.error("Error setting item in storage:", error);
    }
  }

  async removeItem(key: string) {
    try {
      await invoke("remove_item", { key });
    } catch (error) {
      console.error("Error removing item from storage:", error);
    }
  }

  async getAllItems(): Promise<Record<string, string>> {
    try {
      const items = await invoke<string>("get_all_items");
      return JSON.parse(items);
    } catch (error) {
      console.error("Error getting all items from storage:", error);
      return {};
    }
  }
}

const nativeStorage = new NativeStorage();

export const nativeStateStorage: any = {
  getItem: async (key: string) => {
    return await nativeStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    await nativeStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    await nativeStorage.removeItem(key);
  },
};

export default nativeStorage;

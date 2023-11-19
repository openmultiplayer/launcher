import { process } from "@tauri-apps/api";

export namespace Log {
  export const info = (message?: any, ...optionalParams: any[]) => {
    console.log(message, ...optionalParams);
  };

  export const debug = (message?: any, ...optionalParams: any[]) => {
    try {
      // @ts-ignore
      if (process && process.env.NODE_ENV === "development") {
        console.log(message, ...optionalParams);
      }
    } catch (e) {}
  };
}

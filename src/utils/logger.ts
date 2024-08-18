import { DEBUG_MODE } from "../constants/app";

export namespace Log {
  export const info = (message?: any, ...optionalParams: any[]) => {
    console.log(message, ...optionalParams);
  };

  export const debug = (message?: any, ...optionalParams: any[]) => {
    try {
      if (DEBUG_MODE) {
        console.log(message, ...optionalParams);
      }
    } catch (e) {}
  };
}

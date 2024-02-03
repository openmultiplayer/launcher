export namespace Log {
  export const info = (message?: any, ...optionalParams: any[]) => {
    console.log(message, ...optionalParams);
  };

  export const debug = (message?: any, ...optionalParams: any[]) => {
    try {
      // @ts-ignore
      if (DEBUG_MODE) {
        console.log(message, ...optionalParams);
      }
    } catch (e) {}
  };
}

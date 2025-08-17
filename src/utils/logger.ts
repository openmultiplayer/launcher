import { invoke } from "@tauri-apps/api";
import { DEBUG_MODE } from "../constants/app";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  timestamp: Date;
  message: string;
  data?: any[];
}

class Logger {
  private static logs: LogEntry[] = [];
  private static maxLogs = 1000;

  private static addLog(level: LogLevel, message: any, optionalParams: any[]) {
    const logEntry: LogEntry = {
      level,
      timestamp: new Date(),
      message: typeof message === "string" ? message : String(message),
      data: optionalParams.length > 0 ? optionalParams : undefined,
    };

    this.logs.push(logEntry);

    // Cleanup old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  static info(message?: any, ...optionalParams: any[]) {
    console.log(message, ...optionalParams);

    const formattedMessage =
      optionalParams.length > 0
        ? `${message} ${optionalParams.join(" ")}`
        : String(message);

    invoke("log_info", { msg: formattedMessage });

    this.addLog(LogLevel.INFO, message, optionalParams);
  }

  static debug(message?: any, ...optionalParams: any[]) {
    if (DEBUG_MODE) {
      console.log("[DEBUG]", message, ...optionalParams);
      this.addLog(LogLevel.DEBUG, message, optionalParams);
    }
  }

  static warn(message?: any, ...optionalParams: any[]) {
    console.warn(message, ...optionalParams);

    const formattedMessage =
      optionalParams.length > 0
        ? `${message} ${optionalParams.join(" ")}`
        : String(message);

    invoke("log_warn", { msg: formattedMessage });

    this.addLog(LogLevel.WARN, message, optionalParams);
  }

  static error(message?: any, ...optionalParams: any[]) {
    console.error(message, ...optionalParams);

    const formattedMessage =
      optionalParams.length > 0
        ? `${message} ${optionalParams.join(" ")}`
        : String(message);

    invoke("log_error", { msg: formattedMessage });
    this.addLog(LogLevel.ERROR, message, optionalParams);
  }

  static getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter((log) => log.level >= level);
    }
    return [...this.logs];
  }

  static clearLogs() {
    this.logs = [];
  }
}

export const Log = Logger;

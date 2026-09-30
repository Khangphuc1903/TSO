import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { API_ORIGIN } from "./axiosClient";

export function createAppHub() {
  const token = localStorage.getItem("token");
  return new HubConnectionBuilder()
    .withUrl(`${API_ORIGIN}/hubs/app`, { accessTokenFactory: () => token || "" })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}

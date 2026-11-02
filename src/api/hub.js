import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { API_ORIGIN } from "./axiosClient";

export function createAppHub() {
  return new HubConnectionBuilder()
    .withUrl(`${API_ORIGIN}/hubs/app`, {
      accessTokenFactory: () => sessionStorage.getItem("token") || localStorage.getItem("token") || "",
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}

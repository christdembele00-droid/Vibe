import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { api } from "./api";

export async function registerPushDevice(idToken: string, deviceName?: string) {
  if (!Capacitor.isNativePlatform()) return null;
  const permission = await FirebaseMessaging.requestPermissions();
  if (permission.receive !== "granted") throw new Error("Notifications non autorisées");
  const { token } = await FirebaseMessaging.getToken();
  return api("/devices", {
    method: "POST",
    token: idToken,
    body: JSON.stringify({
      platform: "android",
      push_token: token,
      device_name: deviceName ?? "VIBE Android",
    }),
  });
}

export async function unregisterPushDevice(deviceId: string, idToken: string) {
  return api("/devices/" + deviceId, { method: "DELETE", token: idToken });
}

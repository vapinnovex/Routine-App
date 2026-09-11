import { Platform } from "react-native";

const KEY = "routine-session";

export async function readSession(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync(KEY);
}

export async function saveSession(token: string | null): Promise<void> {
  if (Platform.OS === "web") return; // Browser sessions use an HttpOnly cookie.
  const SecureStore = await import("expo-secure-store");
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
}

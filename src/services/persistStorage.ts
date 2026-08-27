import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createJSONStorage } from "zustand/middleware";

const serverStorage = {
  getItem: async (_name: string) => null,
  setItem: async (_name: string, _value: string) => {},
  removeItem: async (_name: string) => {},
};

const browserStorage = {
  getItem: async (name: string) => window.localStorage.getItem(name),
  setItem: async (name: string, value: string) =>
    window.localStorage.setItem(name, value),
  removeItem: async (name: string) => window.localStorage.removeItem(name),
};

export function createPersistStorage<T>() {
  return createJSONStorage<T>(() =>
    Platform.OS === "web"
      ? typeof window === "undefined"
        ? serverStorage
        : browserStorage
      : AsyncStorage,
  );
}

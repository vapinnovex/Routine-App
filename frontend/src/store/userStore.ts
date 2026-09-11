import { create } from "zustand";
import { defaultPreferences, type UserPreferences, type UserProfile } from "@/types/models";

interface UserState {
  hydrated: boolean;
  user: UserProfile | null;
  updateName: (name: string) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  markSampleInstalled: (installed: boolean) => void;
}

// Account data is loaded from the API by accountSync, never local storage.
export const useUserStore = create<UserState>((set, get) => ({
  hydrated: false,
  user: null,
  updateName: (name) => {
    const user = get().user;
    if (user && name.trim()) set({ user: { ...user, name: name.trim() } });
  },
  updatePreferences: (patch) => {
    const user = get().user;
    if (user) set({ user: { ...user, preferences: { ...user.preferences, ...patch } } });
  },
  markSampleInstalled: (installed) => {
    const user = get().user;
    if (user) set({ user: { ...user, sampleDataInstalled: installed } });
  },
}));

const fallbackPreferences = defaultPreferences();
export const usePreferences = (): UserPreferences =>
  useUserStore((state) => state.user?.preferences ?? fallbackPreferences);

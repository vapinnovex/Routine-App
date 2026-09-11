import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createPersistStorage } from "@/services/persistStorage";
import {
    defaultPreferences,
    type UserPreferences,
    type UserProfile,
} from "@/types/models";
import { createId } from "@/utils/id";

interface UserState {
  hydrated: boolean;
  user: UserProfile | null;
  setHydrated: () => void;
  completeOnboarding: (name: string, installSample: boolean) => void;
  updateName: (name: string) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  markSampleInstalled: (installed: boolean) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      user: null,
      setHydrated: () => set({ hydrated: true }),
      completeOnboarding: (name, installSample) => {
        const now = new Date().toISOString();
        set({
          user: {
            id: createId(),
            name: name.trim(),
            createdAt: now,
            onboardingComplete: true,
            sampleDataInstalled: installSample,
            preferences: defaultPreferences(),
          },
        });
      },
      updateName: (name) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, name: name.trim() } });
      },
      updatePreferences: (patch) => {
        const user = get().user;
        if (!user) return;
        set({
          user: {
            ...user,
            preferences: { ...user.preferences, ...patch },
          },
        });
      },
      markSampleInstalled: (installed) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, sampleDataInstalled: installed } });
      },
      clearUser: () => set({ user: null }),
    }),
    {
      name: "routine-user",
      storage: createPersistStorage<Pick<UserState, "user">>(),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => () => {
        useUserStore.setState({ hydrated: true });
      },
    },
  ),
);

export const usePreferences = (): UserPreferences =>
  useUserStore((state) => state.user?.preferences ?? fallbackPreferences);

const fallbackPreferences = defaultPreferences();

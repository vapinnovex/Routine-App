import { create } from "zustand";

export const useConnectionStore = create<{
  ready: boolean;
  saving: boolean;
  error: string | null;
  conflict: boolean;
}>(() => ({ ready: false, saving: false, error: null, conflict: false }));

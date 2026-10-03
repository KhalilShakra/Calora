import { LOCAL_USER_ID } from "@/types";
import { create } from "zustand";

export const USER_ID_STORAGE_KEY = "ff-user-id";

export interface AuthState {
  ready: boolean;
  userId: string;
  email: string | null;
  signedIn: boolean;
  setAuth: (patch: Partial<Omit<AuthState, "setAuth">>) => void;
}

function readStoredUserId(): string {
  if (typeof window === "undefined") return LOCAL_USER_ID;
  try {
    return localStorage.getItem(USER_ID_STORAGE_KEY) || LOCAL_USER_ID;
  } catch {
    return LOCAL_USER_ID;
  }
}

export const useAuth = create<AuthState>((set) => ({
  ready: false,
  userId: readStoredUserId(),
  email: null,
  signedIn: false,
  setAuth: (patch) => set(patch),
}));

export function getUserId(): string {
  return useAuth.getState().userId;
}

export function persistUserId(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  } catch {
    /* ignore quota / private mode */
  }
}

export function useUserId(): string {
  return useAuth((s) => s.userId);
}

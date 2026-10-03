import { todayKey } from "@/lib/dates";
import type { MealType } from "@/types";
import { create } from "zustand";

interface UiState {
  selectedDate: string;
  selectedMeal: MealType;
  addOpen: boolean;
  toast: string | null;
  setDate: (date: string) => void;
  setMeal: (meal: MealType) => void;
  setAddOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUi = create<UiState>((set) => ({
  selectedDate: todayKey(),
  selectedMeal: "breakfast",
  addOpen: false,
  toast: null,
  setDate: (selectedDate) => set({ selectedDate }),
  setMeal: (selectedMeal) => set({ selectedMeal }),
  setAddOpen: (addOpen) => set({ addOpen }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));

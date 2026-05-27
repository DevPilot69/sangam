import { create } from "zustand";

interface AddEmployeeDraft {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  ctc: number;
  bankIfsc: string;
  pan: string;
}

interface AddEmployeeState {
  draft: AddEmployeeDraft;
  setDraft: (partial: Partial<AddEmployeeDraft>) => void;
  reset: () => void;
}

const initial: AddEmployeeDraft = {
  firstName: "",
  lastName: "",
  email: "",
  department: "Engineering",
  designation: "Analyst",
  ctc: 850000,
  bankIfsc: "",
  pan: "",
};

export const useAddEmployeeStore = create<AddEmployeeState>((set) => ({
  draft: initial,
  setDraft: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),
  reset: () => set({ draft: initial }),
}));

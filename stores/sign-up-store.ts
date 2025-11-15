import { create } from "zustand";

import type { SignUpInput } from "@/lib/validators/auth";

export type SignUpStep = 1 | 2;

const createDefaultValues = (): SignUpInput => ({
  email: "",
  password: "",
  name: "",
  handle: "",
});

type SignUpStore = {
  step: SignUpStep;
  data: SignUpInput;
  setStep: (step: SignUpStep) => void;
  updateData: (values: Partial<SignUpInput>) => void;
  reset: () => void;
};

export const useSignUpStore = create<SignUpStore>((set) => ({
  step: 1,
  data: createDefaultValues(),
  setStep: (step) => set({ step }),
  updateData: (values) =>
    set((state) => ({
      data: { ...state.data, ...values },
    })),
  reset: () =>
    set({
      step: 1,
      data: createDefaultValues(),
    }),
}));

export const signUpDefaultValues = createDefaultValues;

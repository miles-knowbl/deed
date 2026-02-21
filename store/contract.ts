import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ContractFormData, ContractState } from "@/types/contract";

export const useContractStore = create<ContractState>()(
  persist(
    (set) => ({
      formData: null,
      contractText: "",
      pandaDocId: null,

      setFormData: (data: ContractFormData) => set({ formData: data }),

      appendContractText: (chunk: string) =>
        set((state) => ({ contractText: state.contractText + chunk })),

      setContractText: (text: string) => set({ contractText: text }),

      setPandaDocId: (id: string) => set({ pandaDocId: id }),

      reset: () => set({ formData: null, contractText: "", pandaDocId: null }),
    }),
    {
      name: "deed-contract",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

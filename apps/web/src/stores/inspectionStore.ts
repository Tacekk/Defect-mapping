import { create } from 'zustand';
import type { Session, Item, Product, Workstation, DefectType } from '@glass-inspector/shared';

interface InspectionState {
  currentSession: Session | null;
  currentItem: Item | null;
  currentItemIndex: number;
  items: Item[];
  selectedWorkstation: Workstation | null;
  selectedProduct: Product | null;
  defectTypes: DefectType[];
  isTimerRunning: boolean;
  activeTime: number;
  setCurrentSession: (session: Session | null) => void;
  setCurrentItem: (item: Item | null) => void;
  setCurrentItemIndex: (index: number) => void;
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  updateItem: (item: Item) => void;
  setSelectedWorkstation: (workstation: Workstation | null) => void;
  setSelectedProduct: (product: Product | null) => void;
  setDefectTypes: (types: DefectType[]) => void;
  startTimer: () => void;
  stopTimer: () => void;
  updateActiveTime: (time: number) => void;
  reset: () => void;
}

const initialState = {
  currentSession: null,
  currentItem: null,
  currentItemIndex: 0,
  items: [],
  selectedWorkstation: null,
  selectedProduct: null,
  defectTypes: [],
  isTimerRunning: false,
  activeTime: 0,
};

export const useInspectionStore = create<InspectionState>((set) => ({
  ...initialState,
  setCurrentSession: (session) => set({ currentSession: session }),
  setCurrentItem: (item) => set({ currentItem: item }),
  setCurrentItemIndex: (index) => set({ currentItemIndex: index }),
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItem: (updatedItem) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      ),
      currentItem:
        state.currentItem?.id === updatedItem.id
          ? updatedItem
          : state.currentItem,
    })),
  setSelectedWorkstation: (workstation) =>
    set({ selectedWorkstation: workstation }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setDefectTypes: (types) => set({ defectTypes: types }),
  startTimer: () => set({ isTimerRunning: true }),
  stopTimer: () => set({ isTimerRunning: false }),
  updateActiveTime: (time) => set({ activeTime: time }),
  reset: () => set(initialState),
}));

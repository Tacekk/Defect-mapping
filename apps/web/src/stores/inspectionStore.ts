import { create } from 'zustand';
import type { Session, Item, ItemWithDefects, Product, Workstation, DefectType } from '@glass-inspector/shared';

type InspectionItem = Item | ItemWithDefects;

interface InspectionState {
  currentSession: Session | null;
  currentItem: InspectionItem | null;
  currentItemIndex: number;
  items: InspectionItem[];
  selectedWorkstation: Workstation | null;
  selectedProduct: Product | null;
  defectTypes: DefectType[];
  isTimerRunning: boolean;
  activeTime: number;
  setCurrentSession: (session: Session | null) => void;
  setCurrentItem: (item: InspectionItem | null) => void;
  setCurrentItemIndex: (index: number) => void;
  setItems: (items: InspectionItem[]) => void;
  addItem: (item: InspectionItem) => void;
  updateItem: (item: InspectionItem) => void;
  setSelectedWorkstation: (workstation: Workstation | null) => void;
  setSelectedProduct: (product: Product | null) => void;
  setDefectTypes: (types: DefectType[]) => void;
  startTimer: () => void;
  stopTimer: () => void;
  updateActiveTime: (time: number) => void;
  reset: () => void;
}

// Session-specific state that gets reset when ending a session
const sessionState = {
  currentSession: null,
  currentItem: null,
  currentItemIndex: 0,
  items: [],
  isTimerRunning: false,
  activeTime: 0,
};

// Full initial state including app-wide data
const initialState = {
  ...sessionState,
  selectedWorkstation: null,
  selectedProduct: null,
  defectTypes: [],  // App-wide, not reset on session end
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
  reset: () => set(sessionState),  // Only reset session-specific state, keep defectTypes
}));

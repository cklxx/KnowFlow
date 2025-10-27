import { create } from 'zustand';
import type { Direction } from '../types/api';

interface DirectionState {
  selectedDirectionId: string | null;
  setSelectedDirectionId: (id: string | null) => void;
  directions: Direction[];
  setDirections: (directions: Direction[]) => void;
}

/**
 * Direction store for managing selected direction and direction list
 */
export const useDirectionStore = create<DirectionState>((set) => ({
  selectedDirectionId: null,
  setSelectedDirectionId: (id) => set({ selectedDirectionId: id }),
  directions: [],
  setDirections: (directions) => set({ directions }),
}));

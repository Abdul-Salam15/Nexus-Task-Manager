import { create } from 'zustand';

export interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CategoryState {
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  addCategory: (cat: Category) => void;
  removeCategory: (name: string) => void;
}

export const useCategoryStore = create<CategoryState>(set => ({
  categories: [],
  setCategories: categories => set({ categories }),
  addCategory: cat =>
    set(s => s.categories.some(c => c.name === cat.name) ? s : { categories: [...s.categories, cat] }),
  removeCategory: name => set(s => ({ categories: s.categories.filter(c => c.name !== name) })),
}));

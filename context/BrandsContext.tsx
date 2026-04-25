import React, { createContext, useContext, useState, useCallback } from 'react';
import { Brand, BrandCategory } from '../types';

export interface SavedBrand {
  brand: Brand;
  userCategory: BrandCategory;
  savedAt: string;
}

interface BrandsContextType {
  savedBrands: SavedBrand[];
  saveBrand: (brand: Brand, category: BrandCategory) => void;
  removeBrand: (brandId: string) => void;
  isSaved: (brandId: string) => boolean;
  getBrandsByCategory: (category: BrandCategory) => SavedBrand[];
  categoryGroups: { category: BrandCategory; brands: SavedBrand[] }[];
}

const BrandsContext = createContext<BrandsContextType | null>(null);

export function BrandsProvider({ children }: { children: React.ReactNode }) {
  const [savedBrands, setSavedBrands] = useState<SavedBrand[]>([]);

  const saveBrand = useCallback((brand: Brand, category: BrandCategory) => {
    setSavedBrands((prev) => {
      const exists = prev.find((s) => s.brand.id === brand.id);
      if (exists) {
        // Update category if already saved
        return prev.map((s) =>
          s.brand.id === brand.id ? { ...s, userCategory: category } : s
        );
      }
      return [{ brand, userCategory: category, savedAt: new Date().toISOString() }, ...prev];
    });
  }, []);

  const removeBrand = useCallback((brandId: string) => {
    setSavedBrands((prev) => prev.filter((s) => s.brand.id !== brandId));
  }, []);

  const isSaved = useCallback(
    (brandId: string) => savedBrands.some((s) => s.brand.id === brandId),
    [savedBrands]
  );

  const getBrandsByCategory = useCallback(
    (category: BrandCategory) => savedBrands.filter((s) => s.userCategory === category),
    [savedBrands]
  );

  const categoryGroups = React.useMemo(() => {
    const map = new Map<BrandCategory, SavedBrand[]>();
    savedBrands.forEach((s) => {
      const list = map.get(s.userCategory) ?? [];
      list.push(s);
      map.set(s.userCategory, list);
    });
    return Array.from(map.entries()).map(([category, brands]) => ({ category, brands }));
  }, [savedBrands]);

  return (
    <BrandsContext.Provider
      value={{ savedBrands, saveBrand, removeBrand, isSaved, getBrandsByCategory, categoryGroups }}
    >
      {children}
    </BrandsContext.Provider>
  );
}

export function useBrands() {
  const ctx = useContext(BrandsContext);
  if (!ctx) throw new Error('useBrands must be used within BrandsProvider');
  return ctx;
}

"use client";

import { useState, useCallback } from "react";
import type { FotoItem } from "@/types/peca";

export function usePhotoGallery() {
  const [fotos, setFotos] = useState<FotoItem[]>([]);

  const addPhotos = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFotos = Array.from(e.target.files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setFotos((prev) => [...prev, ...newFotos]);
    }
    e.target.value = "";
  }, []);

  const removePhoto = useCallback((index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setFotos([]);
  }, []);

  return { fotos, addPhotos, removePhoto, reset };
}

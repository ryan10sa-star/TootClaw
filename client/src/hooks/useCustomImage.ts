import { useState, useEffect, useCallback } from "react";
import { saveImageBlob, loadImageBlob, clearImageBlob } from "../lib/imageStore";

export function useCustomImage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    loadImageBlob()
      .then((blob) => {
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        }
      })
      .catch(() => {});
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const saveImage = useCallback(async (file: File) => {
    setImageUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
    await saveImageBlob(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }, []);

  const clearImage = useCallback(async () => {
    setImageUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
    await clearImageBlob();
  }, []);

  return { imageUrl, saveImage, clearImage };
}

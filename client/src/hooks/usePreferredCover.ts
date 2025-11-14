import { useEffect, useState } from "react";
import { getCoverPreference } from "@/lib/cover-preferences";

export function usePreferredCover(bookId?: string | null, fallbackUrl?: string) {
  const [coverUrl, setCoverUrl] = useState<string | undefined>(() => {
    if (!bookId) {
      return fallbackUrl;
    }
    const preference = getCoverPreference(bookId);
    return preference?.coverUrl ?? fallbackUrl;
  });

  useEffect(() => {
    if (!bookId) {
      setCoverUrl(fallbackUrl);
      return;
    }

    const updateFromPreference = () => {
      const preference = getCoverPreference(bookId);
      setCoverUrl(preference?.coverUrl ?? fallbackUrl);
    };

    updateFromPreference();

    const handlePreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (detail?.bookId === bookId) {
        setCoverUrl(detail.coverUrl ?? fallbackUrl);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("bookshelves:cover-preference-changed", handlePreferenceChange as EventListener);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "bookshelves:cover-preference-changed",
          handlePreferenceChange as EventListener,
        );
      }
    };
  }, [bookId, fallbackUrl]);

  return coverUrl;
}

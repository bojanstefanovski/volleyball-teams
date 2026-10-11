"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useState sauvegardé dans le localStorage, pour survivre à un rafraîchissement.
 * La valeur stockée est relue après le montage pour éviter un décalage d'hydratation.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // stockage indisponible ou valeur corrompue: on garde la valeur initiale
    }
    loaded.current = true;
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // stockage plein ou bloqué: on ignore
    }
  }, [key, value]);

  return [value, setValue] as const;
}

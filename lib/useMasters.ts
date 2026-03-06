import { useEffect, useState } from "react";
import { fetchMasters, MasterCategory, MasterItem } from "./masters";

const cache: Record<string, MasterItem[]> = {};

export function useMasters(category: MasterCategory) {
  const [items, setItems] = useState<MasterItem[]>(cache[category] ?? []);
  const [loading, setLoading] = useState(!cache[category]);

  useEffect(() => {
    let cancelled = false;

    async function loadData(forceRefresh = false) {
      if (!forceRefresh && cache[category]) {
        setItems(cache[category]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await fetchMasters(category);

        const sorted = [...data].sort((a, b) => {
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
          }
          return a.label.localeCompare(b.label);
        });

        if (!cancelled) {
          cache[category] = sorted;
          setItems(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch masters:", err);

        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    function handleMastersUpdated() {
      loadData(true);
    }

    loadData();

    window.addEventListener("masters-updated", handleMastersUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("masters-updated", handleMastersUpdated);
    };
  }, [category]);

  return { items, loading };
}
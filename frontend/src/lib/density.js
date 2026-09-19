import { useEffect, useState } from "react";

const KEY = "dashboard-density";

// Compact (today's density -- 143 stations on one screen matters) or
// comfortable (~25% bigger rows/type, for a laptop-at-station or phone).
// Applied as a data-density attribute on the document root; the shared
// table styling in index.css reads it, so no component needs a density prop.
export function useDensity() {
  const [density, setDensity] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "comfortable" ? "comfortable" : "compact";
    } catch {
      return "compact";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  const setAndPersist = (value) => {
    setDensity(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* private browsing / storage blocked -- density just won't persist */
    }
  };

  return [density, setAndPersist];
}

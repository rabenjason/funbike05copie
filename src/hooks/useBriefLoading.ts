import { useEffect, useState } from "react";

/**
 * Shows a short loading state each time `key` changes (page, filter, tab…),
 * so skeletons animate the transition instead of content popping in.
 */
export function useBriefLoading(key: string, ms = 320) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(timer);
  }, [key, ms]);

  return loading;
}

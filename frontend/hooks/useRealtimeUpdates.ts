import { useEffect, useCallback, useRef } from "react";

interface UseRealtimeUpdatesOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onUpdate?: () => void;
}

export function useRealtimeUpdates({
  enabled = true,
  interval = 30000, // 30 seconds default
  onUpdate,
}: UseRealtimeUpdatesOptions = {}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date>(new Date());

  const startPolling = useCallback(() => {
    if (!enabled || intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      lastUpdateRef.current = new Date();
      onUpdate?.();
    }, interval);
  }, [enabled, interval, onUpdate]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const forceUpdate = useCallback(() => {
    lastUpdateRef.current = new Date();
    onUpdate?.();
  }, [onUpdate]);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  // Pause polling when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (enabled) {
        startPolling();
        forceUpdate(); // Update immediately when tab becomes visible
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, startPolling, stopPolling, forceUpdate]);

  return {
    lastUpdate: lastUpdateRef.current,
    forceUpdate,
    startPolling,
    stopPolling,
  };
}

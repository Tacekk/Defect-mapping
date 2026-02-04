import { useEffect, useRef, useCallback } from 'react';
import { useInspectionStore } from '@/stores/inspectionStore';

export function useInspectionTimer() {
  const {
    isTimerRunning,
    activeTime,
    startTimer,
    stopTimer,
    updateActiveTime,
  } = useInspectionStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Start/stop timer interval
  useEffect(() => {
    if (isTimerRunning) {
      lastTickRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastTickRef.current) / 1000);
        if (elapsed > 0) {
          updateActiveTime(activeTime + elapsed);
          lastTickRef.current = now;
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTimerRunning, activeTime, updateActiveTime]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, pause timer
        if (isTimerRunning) {
          stopTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTimerRunning, stopTimer]);

  // Handle window blur (user switched apps)
  useEffect(() => {
    const handleBlur = () => {
      if (isTimerRunning) {
        stopTimer();
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [isTimerRunning, stopTimer]);

  const toggle = useCallback(() => {
    if (isTimerRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  }, [isTimerRunning, startTimer, stopTimer]);

  return {
    isRunning: isTimerRunning,
    time: activeTime,
    start: startTimer,
    stop: stopTimer,
    toggle,
  };
}

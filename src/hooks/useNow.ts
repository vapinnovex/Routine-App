import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useTimerStore } from '@/store/timerStore';

export function useNow(intervalMs = 200) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useTimerStore.getState().tickCatchUp();
        setNow(Date.now());
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}

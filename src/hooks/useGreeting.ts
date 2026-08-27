import { useMemo } from 'react';

import { greetingForHour } from '@/utils/dates';
import { useUserStore } from '@/store/userStore';

export function useGreeting() {
  const name = useUserStore((state) => state.user?.name ?? '');
  return useMemo(() => {
    const period = greetingForHour(new Date().getHours());
    const label = period === 'morning' ? 'Good morning' : period === 'afternoon' ? 'Good afternoon' : 'Good evening';
    return {
      period,
      title: name ? `${label}, ${name}` : label,
    };
  }, [name]);
}

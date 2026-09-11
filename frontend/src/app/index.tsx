import { Redirect } from 'expo-router';

import { useUserStore } from '@/store/userStore';

export default function Index() {
  const user = useUserStore((state) => state.user);
  if (!user?.onboardingComplete) {
    return <Redirect href="/welcome" />;
  }
  return <Redirect href="/(tabs)" />;
}

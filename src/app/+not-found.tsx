import { Link, Stack } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <AppText variant="heading">This screen is missing.</AppText>
        <Link href="/">
          <AppText>Go home</AppText>
        </Link>
      </Screen>
    </>
  );
}

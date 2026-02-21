import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0d0415' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="set-vibe" />
    </Stack>
  );
}

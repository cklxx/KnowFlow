import { useMutation } from '@tanstack/react-query';

import {
  bootstrapOnboarding,
  type OnboardingBootstrapPayload,
  type OnboardingBootstrapResult,
} from '@api';

export const useBootstrapOnboarding = () =>
  useMutation<OnboardingBootstrapResult, Error, OnboardingBootstrapPayload>({
    mutationFn: (payload) => bootstrapOnboarding(payload),
  });

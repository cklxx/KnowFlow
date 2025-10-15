import { apiFetch } from './client';
import type {
  OnboardingBootstrapPayload,
  OnboardingBootstrapResult,
} from './types';

const ONBOARDING_PATH = '/api/onboarding/bootstrap';

export const bootstrapOnboarding = (payload: OnboardingBootstrapPayload) =>
  apiFetch<OnboardingBootstrapResult>(ONBOARDING_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

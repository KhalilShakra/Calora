const ONBOARDING_DONE_KEY = "ff-onboarding-complete";

export function markOnboardingFinished(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearOnboardingFinished(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ONBOARDING_DONE_KEY);
  } catch {
    /* ignore */
  }
}

export function readOnboardingFinished(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ONBOARDING_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

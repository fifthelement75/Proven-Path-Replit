const TOKEN_KEY = "career_passport_token";
const USER_KEY = "career_passport_user";

export interface User {
  id: number;
  email: string;
  companyId: number;
  companyName: string;
  role: string;
  employeeId?: number | null;
  name?: string | null;
  profilePhotoUrl?: string | null;
  jobRole?: string | null;
  department?: string | null;
}

export interface SubscriptionStatus {
  plan: string;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  trialActive: boolean;
  trialDaysRemaining: number;
  hasActiveAccess: boolean;
  subscriptionActive: boolean;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

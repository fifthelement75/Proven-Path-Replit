import { createContext, useContext, useState, useCallback, ReactNode } from "react";

const STORAGE_KEY = "pp_onboarding_v1";

export interface OnboardingStep {
  id: string;
  page: string | null;
  target: string | null;
  title: string;
  body: string;
  placement?: "top" | "bottom";
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    page: null,
    target: null,
    title: "Welcome to Proven Path! 👋",
    body: "Let's take a quick tour of the platform — we'll walk you through each feature in the right order so you can get value from day one. The whole tour takes about 2 minutes.",
  },
  {
    id: "employees-page",
    page: "/employees",
    target: "employees-header",
    title: "Step 1: Build Your Team Roster",
    body: "The Employees page is where everything starts. Add everyone in your organization here — each person gets their own profile for performance reviews, skill tracking, AI development plans, and a portable career history report.",
    placement: "bottom",
  },
  {
    id: "add-employee",
    page: "/employees",
    target: "add-employee-btn",
    title: "Add Your First Employee",
    body: "Click 'Add Employee' to create a new record. You'll capture their name, role, department, level, and manager. They'll receive an email invite so they can access their own profile and submit self-reflections.",
    placement: "bottom",
  },
  {
    id: "employee-table",
    page: "/employees",
    target: "employees-table",
    title: "Explore Employee Profiles",
    body: "Click any employee to open their full profile. Inside you'll find tabs for Performance Reviews (manager and 360°), Peer Feedback from 1:1s, an AI-generated Development Plan, and a shareable career history report — a verified record of growth that can be exported in a form of References to take anywhere.",
    placement: "top",
  },
  {
    id: "dashboard",
    page: "/dashboard",
    target: "dashboard-stats",
    title: "Company Health Dashboard",
    body: "Get a real-time view of your entire org — headcount, total reviews, competency averages, and department breakdowns. Scroll down to see every employee's latest score and flag anyone who needs attention. Great for promotion and retention decisions.",
    placement: "bottom",
  },
  {
    id: "candidates",
    page: "/candidates",
    target: "candidates-header",
    title: "Interview Pipeline",
    body: "Track every candidate with structured, role-based scoring rubrics. Rate applicants consistently on technical skills, communication, problem-solving, and culture fit — then keep a verified record of each hiring decision for future reference and bias auditing.",
    placement: "bottom",
  },
  {
    id: "integrations",
    page: "/settings",
    target: "settings-header",
    title: "Connect Your Existing Tools",
    body: "Proven Path integrates with your HRIS (Workday, BambooHR), ATS (Greenhouse, Lever), and meeting tools (Fireflies.ai, Otter.ai) — so performance data stays in sync automatically without manual entry. Connect them here to unlock the full platform.",
    placement: "bottom",
  },
];

export interface OnboardingState {
  active: boolean;
  step: number;
  dismissed: boolean;
}

interface OnboardingContextType {
  state: OnboardingState;
  currentStep: OnboardingStep | null;
  stepIndex: number;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  dismiss: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OnboardingState;
  } catch { /* ignore */ }
  return { active: false, step: 0, dismissed: false };
}

function saveState(s: OnboardingState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(loadState);

  function update(next: OnboardingState) {
    setState(next);
    saveState(next);
  }

  const startTour = useCallback(() => {
    update({ active: true, step: 0, dismissed: false });
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const next = prev.step + 1;
      const newState: OnboardingState = next >= ONBOARDING_STEPS.length
        ? { ...prev, active: false, dismissed: true }
        : { ...prev, step: next };
      saveState(newState);
      return newState;
    });
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => {
      if (prev.step === 0) return prev;
      const newState = { ...prev, step: prev.step - 1 };
      saveState(newState);
      return newState;
    });
  }, []);

  const dismiss = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, active: false, dismissed: true };
      saveState(newState);
      return newState;
    });
  }, []);

  const currentStep = state.active ? (ONBOARDING_STEPS[state.step] ?? null) : null;

  return (
    <OnboardingContext.Provider value={{
      state,
      currentStep,
      stepIndex: state.step,
      totalSteps: ONBOARDING_STEPS.length,
      startTour,
      nextStep,
      prevStep,
      dismiss,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

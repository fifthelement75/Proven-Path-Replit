export interface BehavioralSkill {
  key: string;
  label: string;
  description: string;
}

export interface BehavioralSkillCategory {
  id: string;
  title: string;
  skills: BehavioralSkill[];
}

export const BEHAVIORAL_SKILL_CATEGORIES: BehavioralSkillCategory[] = [
  {
    id: "project_management",
    title: "Project and team management",
    skills: [
      { key: "personalPlanning", label: "Personal planning and delivery", description: "Plans and delivers their own work on time, communicates status clearly." },
      { key: "trackLevelPlanning", label: "Track-level planning and delivery", description: "Plans and estimates work effectively across the track or stream." },
      { key: "solutionDriven", label: "Solution driven and proactive", description: "Seeks out collaboration and removes barriers to make progress." },
      { key: "teamLeadership", label: "Team leadership", description: "Mentors others in core skills and elevates the team's bar." },
    ],
  },
  {
    id: "collaboration",
    title: "Collaboration",
    skills: [
      { key: "persuasion", label: "Persuasion and influence", description: "Builds consensus, listens, and incorporates other points of view." },
      { key: "creativeThinking", label: "Creative thinking", description: "Generates novel ideas and reframes problems productively." },
      { key: "flexibility", label: "Flexibility", description: "Adapts to changing priorities and constraints." },
    ],
  },
  {
    id: "design_strategy",
    title: "Design strategy",
    skills: [
      { key: "decisionMaking", label: "Decision making", description: "Makes timely, well-reasoned decisions even with incomplete data." },
      { key: "constraintManagement", label: "Constraint management", description: "Identifies and navigates trade-offs across scope, time, and quality." },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    skills: [
      { key: "verbalWritten", label: "Practices verbal and written communication skills", description: "Communicates ideas clearly in conversation and writing." },
      { key: "focusedCommunication", label: "Focused communication", description: "Tailors message to audience and stays on point." },
      { key: "leadsGroupConversations", label: "Leads and directs group conversations", description: "Facilitates productive discussion and drives toward outcomes." },
      { key: "interpersonal", label: "Interpersonal and team communication skills", description: "Builds trust through empathy, respect, and active listening." },
    ],
  },
];

export const BEHAVIORAL_SKILL_BY_KEY: Record<string, BehavioralSkill & { categoryTitle: string }> =
  Object.fromEntries(
    BEHAVIORAL_SKILL_CATEGORIES.flatMap((c) =>
      c.skills.map((s) => [s.key, { ...s, categoryTitle: c.title }])
    )
  );

export const BEHAVIORAL_SKILL_KEYS = BEHAVIORAL_SKILL_CATEGORIES.flatMap((c) =>
  c.skills.map((s) => s.key)
);

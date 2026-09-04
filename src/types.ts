export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  image?: string; // Base64 Data URL
  timestamp: string;
  // Store the parsed tutor response if it came from the assistant
  tutorResponse?: TutorResponse;
}

export interface TutorResponse {
  tutorMessage: string;
  currentStepIndex: number;
  totalSteps: number;
  roadmapSteps: string[];
  currentStepStatus: "introducing" | "user_attempting" | "explaining_concept" | "completed";
  suggestedActions: string[];
}

export interface SavedSession {
  id: string;
  problemTitle: string;
  createdAt: string;
  messages: Message[];
  roadmapSteps: string[];
  currentStepIndex: number;
  totalSteps: number;
  subject: string;
}

export interface PresetProblem {
  id: string;
  title: string;
  description: string;
  subject: "calculus" | "algebra";
  formula: string;
  imageUrl?: string;
}

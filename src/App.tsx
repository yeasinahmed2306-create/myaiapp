import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  ArrowRight,
  BookOpen,
  Sparkles,
  RotateCcw,
  PenTool,
  HelpCircle,
  Brain,
  Trash2,
  History,
  ChevronRight,
  Plus,
  CheckCircle2,
  Save,
  LogOut,
  Compass,
} from "lucide-react";
import { Message, SavedSession, PresetProblem, TutorResponse } from "./types";
import SocraticMessage from "./components/SocraticMessage";
import Scratchpad from "./components/Scratchpad";
import Roadmap from "./components/Roadmap";

// Premium Preset Problems
const PRESET_PROBLEMS: PresetProblem[] = [
  {
    id: "preset-1",
    title: "Product Rule & Natural Log Derivative",
    description: "Calculus: Find the first derivative of x times ln(x).",
    subject: "calculus",
    formula: "Find the derivative of f(x) = x \\ln(x) with respect to x.",
  },
  {
    id: "preset-2",
    title: "Solve Quadratic with Fraction Coefficients",
    description: "Algebra: Solve for real roots of a complex quadratic trinomial.",
    subject: "algebra",
    formula: "Solve the quadratic equation: 2x^2 - 5x + 3 = 0",
  },
  {
    id: "preset-3",
    title: "Definite Integral Substitution",
    description: "Calculus: Integrate ln(x)/x from limits 1 to 2.",
    subject: "calculus",
    formula: "Evaluate the definite integral: \\int_1^2 \\frac{\\ln(x)}{x} dx",
  },
  {
    id: "preset-4",
    title: "Trigonometric Special Limits",
    description: "Calculus: Resolve limits of sin(3x)/x as x approaches 0.",
    subject: "calculus",
    formula: "Find the limit: \\lim_{x \\to 0} \\frac{\\sin(3x)}{x}",
  },
];

// API Base URL - defaults to relative path in fullstack mode, or uses VITE_BACKEND_URL if set
const API_BASE = ((import.meta as any).env?.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") || "";

async function sendChatRequest(messages: Array<{ role: string; text?: string; image?: string }>): Promise<TutorResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    let errorMsg = `Server returned status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch {
      if (response.status === 404) {
        errorMsg =
          "Backend endpoint '/api/chat' returned 404. Note: GitHub Pages is a static file host that does not run the Node.js/Express server. Deploy the server (e.g., to Cloud Run, Render, or Railway) and set VITE_BACKEND_URL.";
      }
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

// Encouraging tutor thoughts shown during thinking state
const TUTOR_THOUGHTS = [
  "Examining the equation's core properties...",
  "Formulating a step-by-step roadmap for you...",
  "Analyzing calculus principles and derivatives...",
  "Drafting a patient, Socratic hint to guide you...",
  "Finding intuitive connections to make this simple...",
  "Structuring math definitions for clarity...",
];

export default function App() {
  // Session History & Presets
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [activeSession, setActiveSession] = useState<SavedSession | null>(null);

  // New Problem Form inputs
  const [inputText, setInputText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<"calculus" | "algebra">("calculus");

  // Chat UI states
  const [userAttempt, setUserAttempt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingThought, setLoadingThought] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Floating helper states
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [customNotes, setCustomNotes] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Scroll references
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved sessions from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("socratic_math_sessions");
    if (saved) {
      try {
        setSavedSessions(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading saved sessions", e);
      }
    }
  }, []);

  // Save sessions to LocalStorage on modification
  const saveSessionsToStorage = (updated: SavedSession[]) => {
    setSavedSessions(updated);
    localStorage.setItem("socratic_math_sessions", JSON.stringify(updated));
  };

  // Handle auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, isLoading]);

  // Loading thought cyclical switcher
  useEffect(() => {
    if (!isLoading) return;
    setLoadingThought(TUTOR_THOUGHTS[0]);
    let index = 1;
    const interval = setInterval(() => {
      setLoadingThought(TUTOR_THOUGHTS[index % TUTOR_THOUGHTS.length]);
      index++;
    }, 4500);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Handle drag events for file upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        processImageFile(file);
      } else {
        alert("Please upload an image file (PNG/JPG/WEBP).");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const processImageFile = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Start new problem session
  const handleStartSession = async (presetText?: string) => {
    const textToSubmit = presetText || inputText;

    if (!textToSubmit && !imagePreview) {
      setErrorMessage("Please write a mathematical problem description or upload an image.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Formulate a clean initial user query
    const initialText = textToSubmit
      ? textToSubmit
      : "Socratic Tutor, please analyze this math problem image and walk me through the first step.";

    const initialMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      text: initialText,
      image: imagePreview || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      // API call to Socratic tutor back-end
      const data = await sendChatRequest([
        {
          role: "user",
          text: initialText,
          image: imagePreview || undefined,
        },
      ]);

      const assistantMsgId = `msg-${Date.now()}-assistant`;
      const assistantMessage: Message = {
        id: assistantMsgId,
        role: "assistant",
        text: data.tutorMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tutorResponse: data,
      };

      const titleText = presetText
        ? presetText.slice(0, 45) + (presetText.length > 45 ? "..." : "")
        : textToSubmit
        ? textToSubmit.slice(0, 45) + (textToSubmit.length > 45 ? "..." : "")
        : "Image-Based Problem";

      const newSession: SavedSession = {
        id: `sess-${Date.now()}`,
        problemTitle: titleText,
        createdAt: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        messages: [initialMessage, assistantMessage],
        roadmapSteps: data.roadmapSteps || [],
        currentStepIndex: data.currentStepIndex || 1,
        totalSteps: data.totalSteps || 4,
        subject: selectedSubject,
      };

      // Save to sessions history and focus on active workspace
      const updatedSessions = [newSession, ...savedSessions];
      saveSessionsToStorage(updatedSessions);
      setActiveSession(newSession);

      // Clean input form
      setInputText("");
      clearImageSelection();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred while launching Socratic tutoring.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit next reply in active chat
  const handleSendReply = async (specificText?: string) => {
    const replyText = specificText || userAttempt;
    if (!replyText && !imagePreview) return;

    if (!activeSession) return;

    setIsLoading(true);
    setErrorMessage(null);

    const userMessageId = `msg-${Date.now()}-user`;
    const userMsg: Message = {
      id: userMessageId,
      role: "user",
      text: replyText,
      image: imagePreview || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update session state locally with the new user message first to keep chat fluid
    const interimMessages = [...activeSession.messages, userMsg];
    const updatedActiveSession = {
      ...activeSession,
      messages: interimMessages,
    };
    setActiveSession(updatedActiveSession);
    setUserAttempt("");
    clearImageSelection();

    try {
      // Map entire chat history to Gemini payload structure
      const chatPayload = interimMessages.map((msg) => ({
        role: msg.role,
        text: msg.text,
        image: msg.image,
      }));

      const data = await sendChatRequest(chatPayload);

      const assistantMsgId = `msg-${Date.now()}-assistant`;
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        text: data.tutorMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tutorResponse: data,
      };

      const finalSessionState: SavedSession = {
        ...updatedActiveSession,
        messages: [...interimMessages, assistantMsg],
        roadmapSteps: data.roadmapSteps && data.roadmapSteps.length > 0 ? data.roadmapSteps : updatedActiveSession.roadmapSteps,
        currentStepIndex: data.currentStepIndex || updatedActiveSession.currentStepIndex,
        totalSteps: data.totalSteps || updatedActiveSession.totalSteps,
        subject: activeSession.subject,
      };

      // Save to storage and focus state
      const updatedSessions = savedSessions.map((s) => (s.id === activeSession.id ? finalSessionState : s));
      saveSessionsToStorage(updatedSessions);
      setActiveSession(finalSessionState);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred. Please try sending your response again.");
      // Rollback user message if error happens to prevent confusing state
      const rollbackedSession = {
        ...activeSession,
        messages: activeSession.messages,
      };
      setActiveSession(rollbackedSession);
    } finally {
      setIsLoading(false);
    }
  };

  // Exit tutoring panel back to dashboard
  const handleExitSession = () => {
    setActiveSession(null);
    setErrorMessage(null);
    setUserAttempt("");
    clearImageSelection();
  };

  // Delete saved session
  const handleDeleteSession = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this study notebook?")) {
      const updated = savedSessions.filter((s) => s.id !== idToDelete);
      saveSessionsToStorage(updated);
      if (activeSession && activeSession.id === idToDelete) {
        setActiveSession(null);
      }
    }
  };

  return (
    <div id="app-root" className="min-h-screen bg-[#faf9f6] text-slate-900 font-sans flex flex-col antialiased">
      {/* Top Header navbar */}
      <header className="border-b border-slate-200/60 bg-white/90 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif font-medium tracking-tight text-lg text-slate-900 flex items-center gap-2">
              Socratic Math Tutor
            </h1>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider uppercase">Patient · Supportive · Socratic</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeSession && (
            <button
              onClick={handleExitSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              title="Return to Dashboard"
            >
              <LogOut size={14} />
              <span>Exit Session</span>
            </button>
          )}
          <span className="text-xs text-slate-400 font-mono hidden md:inline">2026 Calculus Sandbox</span>
        </div>
      </header>

      {/* Main Layout Workspace Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar on Desktop (Notebook History & Presets) */}
        {!activeSession ? (
          <section className="lg:col-span-4 space-y-6">
            
            {/* Quick Presets Block */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Preset Socratic Lessons</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click any standard calculus or algebra challenge below to initiate a Socratic lesson.
              </p>
              <div className="space-y-2.5">
                {PRESET_PROBLEMS.map((prob) => (
                  <button
                    key={prob.id}
                    onClick={() => {
                      setSelectedSubject(prob.subject);
                      handleStartSession(prob.formula);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 bg-[#fbfbfa] hover:bg-amber-50/40 hover:border-amber-200/50 hover:shadow-sm transition-all duration-200 group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono tracking-wider uppercase px-1.5 py-0.5 bg-slate-200/60 rounded text-slate-600">
                        {prob.subject}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-800 group-hover:text-amber-900 transition-colors">
                      {prob.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      {prob.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Study Session Notebooks List */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <History className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-800 text-sm">My Saved Notebooks</h3>
              </div>

              {savedSessions.length === 0 ? (
                <div className="text-center py-6">
                  <div className="inline-flex p-3 bg-slate-50 rounded-full text-slate-300 mb-2">
                    <History size={20} />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">No saved lessons yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] mx-auto">
                    Lessons you initiate will appear here for subsequent study.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {savedSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setActiveSession(session)}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-emerald-200/60 bg-white hover:bg-emerald-50/20 shadow-sm hover:shadow cursor-pointer group transition-all duration-200"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-mono">
                          <span className="capitalize">{session.subject}</span>
                          <span>•</span>
                          <span>{session.createdAt}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 truncate group-hover:text-emerald-950">
                          {session.problemTitle}
                        </h4>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${(session.currentStepIndex / session.totalSteps) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono">
                            Step {session.currentStepIndex}/{session.totalSteps}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2 shrink-0 opacity-0 group-hover:opacity-100"
                        title="Delete Notebook"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Center/Right Workspace panel */}
        <section className={`col-span-1 lg:col-span-8 space-y-6 ${activeSession ? "lg:col-span-12" : ""}`}>
          
          {/* Error alerts */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-red-800">Tutoring Bridge Warning</h4>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg shrink-0 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Core State: Dashboard Entry vs Active Math Session */}
          {!activeSession ? (
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
              
              {/* Dashboard Slogan */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200/50 rounded-full text-xs font-semibold">
                  <Compass size={12} />
                  <span>The Socratic Calculus & Algebra Assistant</span>
                </div>
                <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-900 md:text-3xl">
                  Let's unlock math intuitive patterns together.
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                  Upload a clean photograph of your homework, hand-written calculations, or textbooks. 
                  My job isn't to spoon-feed solutions; I'll walk with you step-by-step, explain underlying definitions, 
                  and assist you when you get stuck.
                </p>
              </div>

              {/* Form Upload & Input area */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Subject Dropdown Selector */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Subject Matter
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value as "calculus" | "algebra")}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    >
                      <option value="calculus">Calculus (Integrals, Limits, Derivatives)</option>
                      <option value="algebra">Algebra (Equations, Matrices, Factoring)</option>
                    </select>
                  </div>

                  {/* Math Formula Text field */}
                  <div className="md:col-span-8">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Or Describe/Type problem
                    </label>
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="e.g., f(x) = x * ln(x), integrate sin(x) from 0 to pi, solve for critical points"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs bg-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </div>
                </div>

                {/* Multimodal drag-and-drop Photo Box */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    dragActive
                      ? "border-amber-500 bg-amber-50/20"
                      : "border-slate-200 hover:border-amber-300 hover:bg-slate-50/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {!imagePreview ? (
                    <div className="space-y-2.5">
                      <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-full">
                        <Upload size={22} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-700">
                          Drag and drop your math problem photo here
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Supports JPG, PNG, WEBP from your device or camera
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Browse Files
                      </button>
                    </div>
                  ) : (
                    <div className="relative inline-block max-w-[280px]">
                      <img
                        src={imagePreview}
                        alt="Math problem preview"
                        className="rounded-xl border border-slate-200/80 shadow-md max-h-[180px] object-contain"
                      />
                      <button
                        type="button"
                        onClick={clearImageSelection}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Action launcher */}
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => handleStartSession()}
                    disabled={isLoading || (!inputText && !imagePreview)}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/10 font-semibold text-xs tracking-wide uppercase transition-all duration-200"
                  >
                    <span>Begin Socratic Session</span>
                    <Sparkles size={13} className="animate-pulse" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            
            /* Active Math Socratic Arena */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column of Active Arena (Roadmap, scratchpad notes, collapsible image) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Visual Roadmap component */}
                <Roadmap
                  steps={activeSession.roadmapSteps}
                  currentStepIndex={activeSession.currentStepIndex}
                  totalSteps={activeSession.totalSteps}
                  currentStepStatus={activeSession.messages[activeSession.messages.length - 1]?.tutorResponse?.currentStepStatus || "user_attempting"}
                />

                {/* Collage original thumbnail */}
                {activeSession.messages[0]?.image && (
                  <div className="bg-white border border-slate-200/60 shadow-md rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-slate-400" />
                      <span>Original Problem Photo</span>
                    </h4>
                    <div className="relative group overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      <img
                        src={activeSession.messages[0].image}
                        alt="Original math problem source"
                        className="w-full max-h-[140px] object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[10px] text-white font-semibold tracking-wider uppercase bg-slate-900/80 px-2 py-1 rounded-md">
                          Source Reference
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tactile Scratchpad Toggle Button */}
                <div className="space-y-4">
                  <button
                    onClick={() => setShowScratchpad(!showScratchpad)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      showScratchpad
                        ? "bg-slate-900 border-slate-950 text-white shadow-lg"
                        : "bg-white border-slate-200/60 hover:bg-slate-50 text-slate-700 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <PenTool size={16} className={showScratchpad ? "text-emerald-400" : "text-emerald-600"} />
                      <div className="text-left">
                        <p className="text-xs font-semibold">Scribble Scratchpad</p>
                        <p className={`text-[10px] mt-0.5 ${showScratchpad ? "text-slate-400" : "text-slate-400"}`}>
                          Draft calculations & draw curves
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase font-semibold ${
                      showScratchpad ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-100 text-slate-500"
                    }`}>
                      {showScratchpad ? "ON" : "OFF"}
                    </span>
                  </button>

                  {/* Expand Scratchpad Canvas inline */}
                  {showScratchpad && (
                    <Scratchpad onClose={() => setShowScratchpad(false)} />
                  )}
                </div>

                {/* Study Notes Card */}
                <div className="bg-white border border-slate-200/60 shadow-md rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-amber-500" />
                    <span>My Lesson Notes</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Write down key equations or concepts the Socratic tutor explained, to review later.
                  </p>
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="e.g., Product rule states that d/dx [u*v] = u'v + uv'... Limit properties..."
                    className="w-full h-[100px] p-3 text-xs border border-slate-100 bg-[#fcfcfb] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Right Column of Active Arena (The Conversation Arena) */}
              <div className="lg:col-span-8 flex flex-col bg-white border border-slate-200/60 shadow-md rounded-2xl overflow-hidden min-h-[550px]">
                
                {/* Chat Header info banner */}
                <div className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-xs">
                      {activeSession.problemTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono capitalize">
                      {activeSession.subject} Mode
                    </span>
                  </div>
                </div>

                {/* Chat Messages Log list */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[500px]">
                  {activeSession.messages.map((msg, index) => {
                    const isTutor = msg.role === "assistant";
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3.5 max-w-[85%] ${isTutor ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                      >
                        {/* Avatar Icons */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                            isTutor
                              ? "bg-amber-100 border-amber-200/50 text-amber-800"
                              : "bg-slate-900 border-slate-950 text-white"
                          }`}
                        >
                          {isTutor ? <Brain size={14} /> : <HelpCircle size={14} />}
                        </div>

                        {/* Speech Bubble Card */}
                        <div className="space-y-1.5 flex-1">
                          <div className={`flex items-center gap-2 ${isTutor ? "justify-start" : "justify-end"}`}>
                            <span className="text-[10px] font-semibold text-slate-600 font-mono">
                              {isTutor ? "Socratic Tutor" : "Student"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">{msg.timestamp}</span>
                          </div>

                          <div
                            className={`p-4 rounded-2xl border text-sm ${
                              isTutor
                                ? "bg-amber-50/20 border-amber-200/30 text-slate-800 shadow-sm"
                                : "bg-slate-100/60 border-slate-200/40 text-slate-800"
                            }`}
                          >
                            {/* Message Image attachment if user submitted one */}
                            {msg.image && (
                              <div className="mb-3 max-w-[220px]">
                                <img
                                  src={msg.image}
                                  alt="Math problem workspace"
                                  className="rounded-xl border border-slate-200 max-h-[140px] object-contain"
                                />
                              </div>
                            )}

                            {/* Main Math/Markdown formatted Text message */}
                            <SocraticMessage text={msg.text} />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Tutor Reasoning / Thought loader */}
                  {isLoading && (
                    <div className="flex gap-3.5 max-w-[85%] mr-auto items-start">
                      <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200/50 text-amber-800 flex items-center justify-center shrink-0 animate-bounce">
                        <Brain size={14} />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-600 font-mono">
                            Socratic Tutor
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono animate-pulse">thinking...</span>
                        </div>
                        <div className="p-4 bg-amber-50/20 border border-amber-200/20 rounded-2xl space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex space-x-1">
                              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                            <span className="text-xs text-amber-800/80 font-medium italic select-none">
                              {loadingThought}
                            </span>
                          </div>
                          {/* Socratic layout dummy boxes representing thought blocks */}
                          <div className="space-y-1.5">
                            <div className="h-2 bg-amber-200/20 rounded w-[90%] animate-pulse" />
                            <div className="h-2 bg-amber-200/20 rounded w-[75%] animate-pulse" />
                            <div className="h-2 bg-amber-200/20 rounded w-[80%] animate-pulse" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Socratic helper suggestions chips */}
                {activeSession.messages.length > 0 && !isLoading && (
                  <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100/80 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-wider mr-1 select-none">
                      Guiding Questions:
                    </span>
                    {(activeSession.messages[activeSession.messages.length - 1]?.tutorResponse?.suggestedActions || [
                      "Why did we do that?",
                      "Give me a hint",
                      "I got stuck, please explain this step",
                    ]).map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendReply(action)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 text-xs text-slate-700 hover:text-amber-900 rounded-lg shadow-sm hover:shadow transition-all duration-150 active:scale-95"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                {/* Composer Footer input */}
                <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
                  
                  {/* Miniature Image draft preview if student uploads inline work */}
                  {imagePreview && (
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-2 max-w-xs relative shrink-0">
                      <img
                        src={imagePreview}
                        alt="Workspace draft image"
                        className="w-12 h-12 rounded-lg object-contain border bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-slate-700 truncate">Workspace Photo Added</p>
                        <p className="text-[9px] text-slate-400">Tutor will analyze your math work</p>
                      </div>
                      <button
                        onClick={clearImageSelection}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {/* Inline file upload camera trigger */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50/30 hover:border-amber-200/50 transition-all shrink-0 ${
                        imagePreview ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-white"
                      }`}
                      title="Upload a photo of your calculations work"
                    >
                      <ImageIcon size={16} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* Chat Input Field */}
                    <input
                      type="text"
                      value={userAttempt}
                      onChange={(e) => setUserAttempt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isLoading) {
                          handleSendReply();
                        }
                      }}
                      placeholder="Type your explanation, show your calculation steps, or ask 'Why did we do that?'..."
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-300"
                      disabled={isLoading}
                    />

                    {/* Sender Trigger */}
                    <button
                      onClick={() => handleSendReply()}
                      disabled={isLoading || (!userAttempt && !imagePreview)}
                      className="p-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 shrink-0 shadow-md shadow-amber-500/10 transition-colors"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

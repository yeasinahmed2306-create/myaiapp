import React from "react";
import { Check, Lock, HelpCircle, ArrowRight } from "lucide-react";

interface RoadmapProps {
  steps: string[];
  currentStepIndex: number;
  totalSteps: number;
  currentStepStatus: "introducing" | "user_attempting" | "explaining_concept" | "completed";
}

export default function Roadmap({
  steps,
  currentStepIndex,
  totalSteps,
  currentStepStatus,
}: RoadmapProps) {
  // If no steps are generated, show a placeholder list
  const stepsList = steps && steps.length > 0
    ? steps
    : Array.from({ length: totalSteps || 4 }, (_, i) => `Step ${i + 1}: Formulating solution`);

  return (
    <div className="bg-white border border-slate-200/60 shadow-md rounded-2xl p-5 select-none">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm tracking-wide uppercase">Tutor Roadmap</h3>
          <p className="text-xs text-slate-400 mt-0.5">Socratic Step-by-Step Milestones</p>
        </div>
        <div className="px-2.5 py-1 bg-amber-50 border border-amber-200/50 text-amber-800 font-mono text-xs font-semibold rounded-full">
          Step {Math.min(currentStepIndex, stepsList.length)} of {stepsList.length}
        </div>
      </div>

      <div className="relative pl-1.5 space-y-5">
        {/* Continuous timeline line */}
        <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-slate-100" />

        {stepsList.map((stepTitle, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStepIndex;
          const isActive = stepNum === currentStepIndex;
          const isLocked = stepNum > currentStepIndex;

          let statusColor = "bg-slate-100 border-slate-200 text-slate-400";
          let textColor = "text-slate-400";
          let dotContent = <Lock size={10} />;

          if (isCompleted) {
            statusColor = "bg-emerald-500 border-emerald-600 text-white";
            textColor = "text-slate-600 line-through decoration-slate-300";
            dotContent = <Check size={12} />;
          } else if (isActive) {
            statusColor = "bg-amber-500 border-amber-600 text-white ring-4 ring-amber-100 animate-pulse";
            textColor = "text-slate-800 font-semibold";
            dotContent = <ArrowRight size={12} />;
          }

          return (
            <div key={idx} className="flex items-start gap-3.5 relative group">
              {/* Milestone bullet indicator */}
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full border shadow-sm z-10 shrink-0 ${statusColor}`}
              >
                {dotContent}
              </div>

              {/* Step info block */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-mono uppercase tracking-wider ${isActive ? "text-amber-600 font-bold" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                    Step {stepNum}
                  </span>
                  {isActive && currentStepStatus === "user_attempting" && (
                    <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-medium border border-sky-200/40 rounded-md">
                      Your Attempt
                    </span>
                  )}
                  {isActive && currentStepStatus === "explaining_concept" && (
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200/40 rounded-md">
                      Explaining Concept
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-0.5 leading-snug transition-colors ${textColor}`}>
                  {stepTitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

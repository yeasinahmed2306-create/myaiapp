import React from "react";
import ReactMarkdown from "react-markdown";

interface SocraticMessageProps {
  text: string;
}

// Map of common LaTeX expressions to clean unicode symbols for readable math
export function cleanMathSymbols(latex: string): string {
  return latex
    .replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, "∫[from $1 to $2]") // Integrals with limits
    .replace(/\\int/g, "∫")
    .replace(/\\ln/g, "ln")
    .replace(/\\sin/g, "sin")
    .replace(/\\cos/g, "cos")
    .replace(/\\tan/g, "tan")
    .replace(/\\log/g, "log")
    .replace(/\\pi/g, "π")
    .replace(/\\infty/g, "∞")
    .replace(/\\to/g, "→")
    .replace(/\\limit_\{([^}]+)\}/g, "lim[$1]") // Limits
    .replace(/\\lim_\{([^}]+)\}/g, "lim[$1]")
    .replace(/\\cdot/g, "·")
    .replace(/\\theta/g, "θ")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\sigma/g, "σ")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)")
    .replace(/\\times/g, "×")
    .replace(/\\ge/g, "≥")
    .replace(/\\le/g, "≤")
    .replace(/\\ne/g, "≠")
    .replace(/\\pm/g, "±")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/\^x/g, "ˣ")
    .replace(/\^y/g, "ʸ")
    .replace(/\^n/g, "ⁿ")
    .replace(/\\,/g, " ")
    .replace(/\\quad/g, "   ")
    .replace(/\\qquad/g, "     ")
    .replace(/\\{/g, "{")
    .replace(/\\}/g, "}");
}

export default function SocraticMessage({ text }: SocraticMessageProps) {
  // Split the text by block math blocks ($$)
  const blockParts = text.split(/\$\$/);

  return (
    <div className="space-y-3 leading-relaxed">
      {blockParts.map((blockPart, blockIdx) => {
        const isBlockMath = blockIdx % 2 !== 0;

        if (isBlockMath) {
          const cleanedFormula = cleanMathSymbols(blockPart.trim());
          return (
            <div
              key={blockIdx}
              className="my-4 p-4 text-center bg-amber-50/50 border border-amber-200/40 rounded-xl font-serif text-lg text-amber-950 shadow-inner overflow-x-auto select-all"
            >
              {cleanedFormula}
            </div>
          );
        }

        // Inside standard text, split by inline math blocks ($)
        const inlineParts = blockPart.split(/\$/);

        return (
          <div key={blockIdx} className="markdown-body">
            {inlineParts.map((inlinePart, inlineIdx) => {
              const isInlineMath = inlineIdx % 2 !== 0;

              if (isInlineMath) {
                const cleanedInline = cleanMathSymbols(inlinePart.trim());
                return (
                  <span
                    key={inlineIdx}
                    className="mx-1 px-1.5 py-0.5 font-serif italic bg-amber-100/40 border border-amber-200/60 rounded text-amber-950 text-[15px]"
                  >
                    {cleanedInline}
                  </span>
                );
              }

              // Use ReactMarkdown to render the plain markdown text sections
              return (
                <span key={inlineIdx} className="prose prose-slate max-w-none text-[15px] prose-p:inline">
                  <ReactMarkdown>{inlinePart}</ReactMarkdown>
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

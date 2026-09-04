import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON bodies with limit for base64 image uploads
app.use(express.json({ limit: "20mb" }));

// System instruction for the Socratic Math Tutor
const SYSTEM_INSTRUCTION = `You are a highly compassionate, patient, and brilliant Socratic Math Tutor. Your goal is to guide students through calculus and algebra problems rather than just giving them the solution.

Core Philosophy:
1. You act like a patient, empathetic private teacher sitting next to the student. You use warm, positive, encouraging, and supportive language.
2. When a student uploads a photo of a math problem or types a problem, you analyze it.
3. You break down the problem into a roadmap of high-level logical steps (e.g., Step 1: Simplify the expression, Step 2: Set up the integral, etc.). Keep the step descriptions general so you don't reveal the final solution yet!
4. You ONLY explain and walk the student through the FIRST active step. Do not show the solution to the rest of the steps or the final answer of the problem.
5. You must engage the user Socratically: ask them what they think the next move is, or ask them to perform the first step and show you their work.
6. If the user gets stuck and asks "Why did we do that?", explain ONLY the specific mathematical concept or intuition behind that step. Use warm analogies or intuitive reasoning. Do not jump to other steps.
7. If the user provides an incorrect answer or attempt, DO NOT say "Incorrect" or "Wrong". Instead, say something like "That's an interesting approach! Let's look at this part here..." and guide them to find their own mistake Socratically.
8. Only mark steps as completed and move to the next step when the user either shows they understand, submits a correct intermediate answer, or explicitly requests to see the next step.
9. Under no circumstances should you just dump the entire solution or final answers unless the student has walked through every step or explicitly requests a full demonstration after trying. Even then, prefer explaining the process step-by-step.

Use clean LaTeX style notation for math formulas (enclosed in $$ for block formulas or $ for inline, e.g., $$f(x) = x^2$$ or $x^2$) so the frontend can render it beautifully. Use standard Markdown for headings, bullets, and bold text.`;

// Lazy initialize GoogleGenAI client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please configure it in your Settings > Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint for Socratic Chat
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid 'messages' array in request body." });
    }

    const ai = getAiClient();

    // Map client messages to Gemini content structures
    const contents = messages.map((msg: any) => {
      const parts = [];

      // Add text if present
      if (msg.text) {
        parts.push({ text: msg.text });
      }

      // Add inline image if present
      if (msg.image) {
        const matches = msg.image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          });
        } else {
          // If already plain base64 without prefix
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: msg.image,
            },
          });
        }
      }

      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    // Make the Gemini 3.1 Pro request with HIGH thinking level and JSON schema output
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tutorMessage: {
              type: Type.STRING,
              description: "The main conversational response from the tutor in markdown. Emphasize Socratic tutoring, warm tone, and ask questions rather than revealing the final answer. Use clean LaTeX style notation like $$x^2$$ for math formulas.",
            },
            currentStepIndex: {
              type: Type.INTEGER,
              description: "The current 1-based step index of the problem.",
            },
            totalSteps: {
              type: Type.INTEGER,
              description: "The total number of steps in the roadmap.",
            },
            roadmapSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "The short titles of the steps in the roadmap (e.g., ['Simplify expression', 'Differentiate', 'Solve for x']).",
            },
            currentStepStatus: {
              type: Type.STRING,
              description: "Status of the current step.",
              enum: ["introducing", "user_attempting", "explaining_concept", "completed"],
            },
            suggestedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 short, highly relevant clickable button titles for the user (e.g., 'Why did we do that?', 'Give me a hint', 'I got it! Show next step').",
            },
          },
          required: [
            "tutorMessage",
            "currentStepIndex",
            "totalSteps",
            "roadmapSteps",
            "currentStepStatus",
            "suggestedActions",
          ],
        },
      },
    });

    const replyText = response.text;
    if (!replyText) {
      throw new Error("No response content generated by Gemini.");
    }

    // Parse the JSON output and send back to client
    const jsonResponse = JSON.parse(replyText.trim());
    res.json(jsonResponse);
  } catch (error: any) {
    console.error("Gemini Socratic Chat Error:", error);
    res.status(500).json({
      error: error.message || "An error occurred during Socratic math tutoring.",
    });
  }
});

// Start server and setup Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Socratic Math Tutor running on http://localhost:${PORT}`);
  });
}

startServer();

import { GoogleGenAI } from "@google/genai";
import { KickResult, Kick } from '../types';

// Initialize Gemini Client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing in process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCommentary = async (
  player: string,
  team: string,
  result: KickResult
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Commentary unavailable (API Key missing).";

  try {
    const prompt = `
      Write a very short, energetic, 1-sentence commentary for a penalty kick in a soccer shootout.
      Player: ${player}
      Team: ${team}
      Result: ${result} (Goal, Saved by keeper, or Missed off target)
      Tone: Exciting, like a TV sports commentator.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Error generating commentary:", error);
    return "";
  }
};

export const generateMatchSummary = async (
  teamA: string,
  teamB: string,
  scoreA: number,
  scoreB: number,
  winner: string | null,
  kicks: Kick[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Analysis unavailable.";

  try {
    // Simplify kick data for token efficiency
    const kickLog = kicks.map(k => 
      `R${k.round}-${k.teamId}: ${k.result}`
    ).join(', ');

    const prompt = `
      Analyze this penalty shootout match.
      Match: ${teamA} vs ${teamB}
      Final Score: ${scoreA} - ${scoreB}
      Winner: ${winner === 'A' ? teamA : winner === 'B' ? teamB : 'Draw'}
      Kick Sequence: ${kickLog}

      Provide a concise paragraph summarizing the match flow, the turning point, and the emotional intensity.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No summary generated.";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Failed to generate summary.";
  }
};

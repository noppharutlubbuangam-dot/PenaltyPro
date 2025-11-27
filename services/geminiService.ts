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
      คุณคือนักพากย์ฟุตบอลชาวไทยที่ตื่นเต้นและเร้าใจ
      ช่วยบรรยายจังหวะการยิงจุดโทษนี้สั้นๆ ประโยคเดียว เป็นภาษาไทย:
      
      นักเตะ: ${player}
      ทีม: ${team}
      ผลลัพธ์: ${result === 'GOAL' ? 'ยิงเข้าประตูอย่างสวยงาม' : result === 'SAVED' ? 'ผู้รักษาประตูเซฟไว้ได้' : 'ยิงพลาดออกไปเอง'}
      
      น้ำเสียง: ตื่นเต้น เร้าใจ เหมือนกำลังถ่ายทอดสด
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
      `คนที่ ${k.round} ทีม ${k.teamId}: ${k.result}`
    ).join(', ');

    const prompt = `
      คุณคือนักข่าวกีฬาฟุตบอลอาชีพ ช่วยเขียนสรุปผลการแข่งขันดวลจุดโทษนี้เป็นภาษาไทย ความยาว 1 ย่อหน้าสั้นๆ:
      
      คู่แข่งขัน: ${teamA} vs ${teamB}
      สกอร์รวม: ${scoreA} - ${scoreB}
      ผู้ชนะ: ${winner === 'A' ? teamA : winner === 'B' ? teamB : 'เสมอ'}
      ลำดับการยิง: ${kickLog}

      สิ่งที่ต้องการ:
      - บรรยายรูปเกมความสูสี
      - จุดเปลี่ยนสำคัญของเกม (ใครพลาด ใครเซฟ)
      - จบด้วยการแสดงความยินดีกับผู้ชนะ
      - ใช้ภาษาข่าวกีฬาที่น่าอ่าน สนุก ตื่นเต้น
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "ไม่สามารถสร้างบทสรุปได้";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "เกิดข้อผิดพลาดในการสร้างบทสรุป";
  }
};
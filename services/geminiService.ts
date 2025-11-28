import { GoogleGenAI } from "@google/genai";
import { KickResult, Kick } from '../types';

// Initialize Gemini Client
const getAiClient = () => {
  // หมายเหตุ: การใส่ API Key ใน Client-side code (React) อาจไม่ปลอดภัย 100%
  // หากต้องการความปลอดภัยสูงสุด ควรย้าย Logic นี้ไปไว้ใน Google Apps Script (Code.gs)
  // และสร้าง Function `generateGeminiSummary` ใน GAS เพื่อเรียกใช้แทน
  
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("API_KEY is missing. Please check your .env file.");
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
      สวมบทบาทนักพากย์ฟุตบอลไทย (เสียงตื่นเต้น):
      บรรยายจังหวะจุดโทษนี้สั้นๆ 1 ประโยค:
      นักเตะ: ${player} (${team})
      ผล: ${result === 'GOAL' ? 'เข้าประตู' : result === 'SAVED' ? 'โดนเซฟ' : 'ยิงพลาด'}
      
      คำแนะนำ: ใช้คำศัพท์บอลไทย เช่น "เรียบร้อยครับ", "ซูเปอร์เซฟ", "ชนเสา"
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
  if (!ai) return "Analysis unavailable (Please configure API_KEY).";

  try {
    // 1. Extract Scorers & Heroes (Clean Names)
    const cleanName = (name: string) => name.replace(/[0-9#]/g, '').split('(')[0].trim();

    const scorersA = kicks.filter(k => k.teamId === 'A' && k.result === KickResult.GOAL).map(k => cleanName(k.player));
    const scorersB = kicks.filter(k => k.teamId === 'B' && k.result === KickResult.GOAL).map(k => cleanName(k.player));
    const savedKicks = kicks.filter(k => k.result === KickResult.SAVED).map(k => cleanName(k.player));
    
    // 2. Determine Winner Name
    const winnerName = winner === 'A' ? teamA : winner === 'B' ? teamB : winner || 'เสมอ';

    const prompt = `
      บทบาท: นักข่าวกีฬาฟุตบอลไทย เขียนสรุปผลการดวลจุดโทษสั้นๆ กระชับ สำหรับส่ง LINE Flex Message
      
      ข้อมูลแมตช์:
      - คู่แข่งขัน: ${teamA} vs ${teamB}
      - สกอร์รวม: ${scoreA} - ${scoreB}
      - ผู้ชนะ: ${winnerName}
      - คนยิงเข้า: ${[...scorersA, ...scorersB].join(', ') || 'ไม่มีข้อมูล'}
      - คนยิงพลาด/โดนเซฟ: ${savedKicks.join(', ') || 'ไม่มี'}

      คำสั่ง:
      1. เขียนสรุปข่าวสั้นๆ (ไม่เกิน 2-3 บรรทัด) ให้ได้ใจความ
      2. **ต้องระบุชื่อนักเตะ** ที่มีบทบาทสำคัญ (เช่น คนยิงเข้าสวยๆ หรือ ผู้รักษาประตูที่เซฟได้) อย่างน้อย 1 ชื่อในเนื้อข่าว
      3. ใช้ภาษาพากย์บอลที่ตื่นเต้น สนุกสนาน (เช่น "ซัดตุงตาข่าย", "เซฟช่วยทีม", "เฉือนชนะสุดมันส์")
      4. **สำคัญ:** ห้ามยาวเกิน 200 ตัวอักษร เพื่อประหยัดพื้นที่แสดงผล
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "ไม่สามารถสร้างบทสรุปได้";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "เกิดข้อผิดพลาดในการสร้างบทสรุป (API Error)";
  }
};
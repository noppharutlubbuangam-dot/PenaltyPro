import { GoogleGenAI } from "@google/genai";
import { KickResult, Kick } from '../types';

// Initialize Gemini Client
const getAiClient = () => {
  // หากต้องการ Hardcode API Key เพื่อทดสอบ สามารถใส่ตรงนี้ได้ (ไม่แนะนำสำหรับ Production)
  const apiKey = "AIzaSyDYRYxiK7_a0EDBZljx_rvDQh8kw0eBtVg"; 
  //const apiKey = process.env.API_KEY;
  
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
    // 1. Extract Scorers & Heroes
    const scorersA = kicks.filter(k => k.teamId === 'A' && k.result === KickResult.GOAL).map(k => k.player.split('(')[0].trim());
    const scorersB = kicks.filter(k => k.teamId === 'B' && k.result === KickResult.GOAL).map(k => k.player.split('(')[0].trim());
    const savedKicks = kicks.filter(k => k.result === KickResult.SAVED);
    
    // 2. Determine Winner Name
    const winnerName = winner === 'A' ? teamA : winner === 'B' ? teamB : winner || 'เสมอ';

    const prompt = `
      คุณคือนักข่าวกีฬาสายฟุตบอลไทย เขียนสรุปผลการแข่งสั้นๆ (Breaking News) เพื่อส่งทาง LINE (ห้ามยาวเกินไป):
      
      ข้อมูล:
      - คู่แข่ง: ${teamA} ${scoreA} - ${scoreB} ${teamB}
      - ผู้ชนะ: ${winnerName}
      - ผู้ยิงจุดโทษเข้าฝั่ง ${teamA}: ${scorersA.length > 0 ? scorersA.join(', ') : 'ไม่มี'}
      - ผู้ยิงจุดโทษเข้าฝั่ง ${teamB}: ${scorersB.length > 0 ? scorersB.join(', ') : 'ไม่มี'}
      - การเซฟจุดโทษ: มีการเซฟ ${savedKicks.length} ลูก
      
      คำสั่ง:
      1. เขียนพาดหัวข่าว 1 บรรทัดให้เร้าใจ (ใส่ Emoji ได้)
      2. เขียนเนื้อหาข่าวสั้นๆ 2-3 บรรทัด สรุปความดุเดือด เอ่ยชมคนที่ยิงเข้าหรือผู้รักษาประตู (ถ้ามีข้อมูล)
      3. จบด้วยการยินดีกับผู้ชนะ
      4. **สำคัญ:** รวมทั้งหมดห้ามเกิน 300 ตัวอักษร เพื่อไม่ให้ข้อความยาวเกินไปใน Flex Message
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

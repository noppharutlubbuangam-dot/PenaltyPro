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
      คุณคือนักพากย์ฟุตบอลชาวไทยที่ตื่นเต้นและเร้าใจ (น้ำเสียง: เอกราช เก่งทุกทาง หรือ น้าหัง)
      ช่วยบรรยายจังหวะการยิงจุดโทษนี้สั้นๆ 1 ประโยค เป็นภาษาไทย:
      
      สถานการณ์:
      - นักเตะ: ${player} (ทีม ${team})
      - ผลลัพธ์: ${result === 'GOAL' ? 'ยิงเข้าประตู' : result === 'SAVED' ? 'โดนผู้รักษาประตูเซฟ' : 'ยิงพลาดออกนอกกรอบ'}
      
      คำแนะนำ:
      - ใช้คำศัพท์ฟุตบอลไทย เช่น "เรียบร้อยครับ!", "โอ้โห! ซูเปอร์เซฟ", "น่าเสียดายครับลูกนี้"
      - ไม่ต้องใส่เครื่องหมายคำพูด
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
      คุณคือนักข่าวกีฬาฟุตบอลอาชีพ (สายบอลไทย)
      ช่วยเขียน "พาดหัวข่าว" และ "เนื้อข่าวสรุปสั้นๆ" (Breaking News) สำหรับการดวลจุดโทษแมตช์นี้:
      
      ข้อมูลการแข่ง:
      - คู่แข่งขัน: ${teamA} พบ ${teamB}
      - สกอร์รวม: ${scoreA} - ${scoreB}
      - ผู้ชนะ: ${winner === 'A' ? teamA : winner === 'B' ? teamB : 'เสมอ'}
      - เหตุการณ์ยิงจุดโทษ: ${kickLog}

      รูปแบบการตอบ:
      [พาดหัวข่าวสั้นๆ เร้าใจ]
      
      [เนื้อหาข่าว 1 ย่อหน้า]
      - บรรยายความสูสีและบรรยากาศกดดัน
      - ระบุจุดเปลี่ยนสำคัญ (ใครพลาด หรือใครเซฟได้)
      - จบด้วยการแสดงความยินดีกับผู้ชนะ
      - ใช้ภาษาข่าวฟุตบอลที่อ่านสนุก ตื่นเต้น
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
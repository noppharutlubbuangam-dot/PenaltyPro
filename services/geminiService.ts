import { generateGeminiContent } from './sheetService';
import { KickResult, Kick } from '../types';

// NOTE: We now proxy the request through Google Apps Script (Code.gs)
// to hide the API Key from the client side.

export const generateCommentary = async (
  player: string,
  team: string,
  result: KickResult
): Promise<string> => {
  try {
    const prompt = `
      สวมบทบาทนักพากย์ฟุตบอลไทย (เสียงตื่นเต้น):
      บรรยายจังหวะจุดโทษนี้สั้นๆ 1 ประโยค:
      นักเตะ: ${player} (${team})
      ผล: ${result === 'GOAL' ? 'เข้าประตู' : result === 'SAVED' ? 'โดนเซฟ' : 'ยิงพลาด'}
      
      คำแนะนำ: ใช้คำศัพท์บอลไทย เช่น "เรียบร้อยครับ", "ซูเปอร์เซฟ", "ชนเสา"
    `;

    // Call Proxy instead of direct SDK
    const text = await generateGeminiContent(prompt);
    return text || "";
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
  try {
    // 1. Extract Scorers & Heroes (Clean Names)
    const cleanName = (name: string) => name.replace(/[0-9#]/g, '').split('(')[0].trim();

    const scorersA = kicks.filter(k => k.teamId === 'A' && k.result === KickResult.GOAL).map(k => cleanName(k.player));
    const scorersB = kicks.filter(k => k.teamId === 'B' && k.result === KickResult.GOAL).map(k => cleanName(k.player));
    const savedKicks = kicks.filter(k => k.result === KickResult.SAVED).map(k => cleanName(k.player));
    
    // 2. Determine Winner Name
    const winnerName = winner === 'A' ? teamA : winner === 'B' ? teamB : winner || 'เสมอ';

    const prompt = `
      บทบาท: นักข่าวกีฬาฟุตบอลไทยอาชีพ (น้ำเสียงตื่นเต้น เร้าใจ)
      งาน: เขียนพาดหัวข่าวและสรุปผลการแข่งขันสั้นๆ สำหรับส่ง LINE Notification
      
      ข้อมูลแมตช์:
      - คู่แข่งขัน: ${teamA} vs ${teamB}
      - สกอร์รวม: ${scoreA} - ${scoreB}
      - ผู้ชนะ: ${winnerName}
      - ผู้ทำประตู (Hero): ${[...scorersA, ...scorersB].join(', ') || '-'}
      - ช็อตเซฟสำคัญ (Save): ${savedKicks.join(', ') || '-'}

      คำสั่ง (Strict Output):
      1. เขียนแบบกระชับ (Compact) ไม่เกิน 4 บรรทัด
      2. บรรทัดแรก ต้องเป็นพาดหัวข่าวที่ดึงดูด
      3. เนื้อหา **ต้องระบุชื่อนักเตะ** ที่ยิงเข้าหรือเซฟได้ (ถ้ามี)
      4. ห้ามใช้ Markdown (เช่น **ตัวหนา**) ให้ใช้ Text ธรรมดาที่อ่านง่ายใน LINE
      5. จบด้วยประโยคปิดท้ายสไตล์นักพากย์
    `;

    // Call Proxy
    const text = await generateGeminiContent(prompt);
    return text || "ไม่สามารถสร้างบทสรุปได้ (โปรดตรวจสอบ API Key ที่ Server)";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "เกิดข้อผิดพลาดในการสร้างบทสรุป";
  }
};
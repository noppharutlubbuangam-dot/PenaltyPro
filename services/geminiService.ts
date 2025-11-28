import { generateGeminiContent } from './sheetService';
import { KickResult, Kick } from '../types';

// NOTE: We now proxy the request through Google Apps Script (Code.gs)
// to hide the API Key from the client side and use Script Properties.

export const generateCommentary = async (
  player: string,
  team: string,
  result: KickResult
): Promise<string> => {
  try {
    // Keep prompt very short for quick response
    const prompt = `พากย์บอลสั้นๆ 1 ประโยค: ${player} (${team}) ${result === 'GOAL' ? 'ยิงเข้า' : 'พลาด'}`;
    // Explicitly pass the model to avoid default fallback issues on backend
    const text = await generateGeminiContent(prompt, 'gemini-1.5-flash');
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
  kicks: Kick[],
  model: string = 'gemini-1.5-flash' // Changed default to 1.5-flash for speed/stability
): Promise<string> => {
  try {
    // 1. Extract Scorers & Heroes (Clean Names)
    const cleanName = (name: any) => {
        if (!name) return '';
        // Ensure it's a string before calling replace
        const strName = String(name);
        return strName.replace(/[0-9#]/g, '').split('(')[0].trim();
    };

    const scorersA = kicks.filter(k => k.teamId === 'A' && k.result === KickResult.GOAL).map(k => cleanName(k.player));
    const scorersB = kicks.filter(k => k.teamId === 'B' && k.result === KickResult.GOAL).map(k => cleanName(k.player));
    const savedKicks = kicks.filter(k => k.result === KickResult.SAVED).map(k => cleanName(k.player));
    
    // 2. Determine Winner Name
    const winnerName = winner === 'A' ? teamA : winner === 'B' ? teamB : winner || 'เสมอ';

    const prompt = `
      บทบาท: นักพากย์ฟุตบอลไทย
      งาน: สรุปผลแข่งสั้นๆ
      คู่: ${teamA} vs ${teamB}
      ผล: ${scoreA}-${scoreB} (${winnerName} ชนะ)
      คนยิงเข้า: ${[...scorersA, ...scorersB].filter(n => n).join(', ') || '-'}
      คนเซฟ: ${savedKicks.filter(n => n).join(', ') || '-'}

      คำสั่ง:
      ขอสรุปข่าว 3 บรรทัดจบ:
      1. พาดหัว
      2. รายละเอียดสั้นๆ (ใส่ชื่อคนยิง/คนเซฟ)
      3. ประโยคปิดท้ายมันส์ๆ
    `;

    // Call Proxy with model
    const text = await generateGeminiContent(prompt, model);
    return text || "ระบบ AI กำลังประมวลผล...";
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
};
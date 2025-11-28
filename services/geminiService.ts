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
  kicks: Kick[],
  model: string = 'gemini-2.0-flash-lite' // Updated Default Model
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
      บทบาท: นักพากย์ฟุตบอลไทย
      งาน: สรุปผลแข่งสั้นๆ
      คู่: ${teamA} vs ${teamB}
      ผล: ${scoreA}-${scoreB} (${winnerName} ชนะ)
      คนยิงเข้า: ${[...scorersA, ...scorersB].join(', ') || '-'}
      คนเซฟ: ${savedKicks.join(', ') || '-'}

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
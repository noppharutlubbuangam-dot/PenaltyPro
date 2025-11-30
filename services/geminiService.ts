
import { GoogleGenAI } from "@google/genai";
import { KickResult, Kick, Team } from '../types';

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCommentary = async (
  player: string,
  team: string,
  result: KickResult
): Promise<string> => {
  try {
    const prompt = `พากย์บอลจุดโทษสั้นๆ 1 ประโยค สไตล์ตื่นเต้น เร้าใจ: นักเตะชื่อ ${player} ทีม ${team} ยิงผลลัพธ์คือ ${result === 'GOAL' ? 'เข้าประตู' : result === 'SAVED' ? 'โดนผู้รักษาประตูเซฟ' : 'ยิงพลาดออกไปเอง'}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "";
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
  model: string = 'gemini-2.5-flash'
): Promise<string> => {
  try {
    // 1. Extract Scorers & Heroes (Clean Names)
    const cleanName = (name: any) => {
        if (!name) return '';
        const strName = String(name);
        return strName.replace(/[0-9#]/g, '').split('(')[0].trim();
    };

    const scorersA = kicks.filter(k => k.teamId === 'A' && k.result === KickResult.GOAL).map(k => cleanName(k.player));
    const scorersB = kicks.filter(k => k.teamId === 'B' && k.result === KickResult.GOAL).map(k => cleanName(k.player));
    const savedKicks = kicks.filter(k => k.result === KickResult.SAVED).map(k => cleanName(k.player));
    
    // 2. Determine Winner Name
    const winnerName = winner === 'A' ? teamA : winner === 'B' ? teamB : winner || 'เสมอ';

    const prompt = `
      บทบาท: นักข่าวฟุตบอลสายฮาและเร้าใจ
      งาน: เขียนข่าวสรุปผลการดวลจุดโทษ
      คู่แข่งขัน: ${teamA} vs ${teamB}
      ผลการแข่งขัน: ${scoreA}-${scoreB} (ผู้ชนะ: ${winnerName})
      
      ข้อมูลเพิ่มเติม:
      - ผู้ยิงเข้าฝั่ง A: ${scorersA.join(', ') || '-'}
      - ผู้ยิงเข้าฝั่ง B: ${scorersB.join(', ') || '-'}
      - ผู้รักษาประตูเซฟได้: ${savedKicks.length} ครั้ง (${savedKicks.join(', ')})

      คำสั่ง:
      ขอสรุปข่าวสั้นๆ 3-4 บรรทัด ใส่ Emoji เยอะๆ ให้น่าอ่านสำหรับวัยรุ่นและผู้ปกครอง
      เน้นการชมเชยทั้งสองทีม และยกย่องผู้ชนะ
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "ระบบ AI กำลังประมวลผล...";
  } catch (error) {
    console.error("Error generating summary:", error);
    // Fallback to local logic if API fails is handled in the UI component usually, 
    // but here we just return error message or empty string to trigger fallback there.
    throw error;
  }
};

export const analyzeMatchup = async (teamA: Team, teamB: Team): Promise<string> => {
    try {
        const prompt = `
            วิเคราะห์ก่อนเกมสั้นๆ สนุกๆ (Pre-match analysis):
            ทีม A: ${teamA.name} (ฉายา/ตัวย่อ: ${teamA.shortName})
            ทีม B: ${teamB.name} (ฉายา/ตัวย่อ: ${teamB.shortName})
            
            จังหวัด: ${teamA.province} เจอ ${teamB.province}

            ให้วิเคราะห์เปรียบเทียบแบบขำๆ หรือจริงจังก็ได้ โดยดูจากชื่อทีมและจังหวัด
            ทำนายผลผู้ชนะแบบเดาๆ (ใส่ความเห็นส่วนตัวของ AI)
            ความยาวไม่เกิน 3 บรรทัด
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "";
    } catch (error) {
        return "";
    }
}

// Keep the local fallback for when API is unavailable or quota exceeded
export const generateLocalSummary = (
  teamA: Team,
  teamB: Team,
  scoreA: number,
  scoreB: number,
  winner: string | null,
  kicks: Kick[]
): string => {
  const isWinnerA = winner === 'A' || winner === teamA.name;
  const winnerTeam = isWinnerA ? teamA : teamB;
  const loserTeam = isWinnerA ? teamB : teamA;
  const winScore = isWinnerA ? scoreA : scoreB;
  const loseScore = isWinnerA ? scoreB : scoreA;

  // Helper to extract clean names
  const cleanName = (name: any) => String(name || '').replace(/[0-9#]/g, '').split('(')[0].trim();

  // Extract Scorers for the winning team
  const winnerKicks = kicks.filter(k => (k.teamId === (isWinnerA ? 'A' : 'B') || k.teamId === winnerTeam.name) && k.result === KickResult.GOAL);
  const winnerScorers = winnerKicks.map(k => cleanName(k.player)).filter(n => n).join(', ');
  
  const savedKicks = kicks.filter(k => k.result === KickResult.SAVED && (k.teamId === (isWinnerA ? 'B' : 'A') || k.teamId === loserTeam.name));
  const hasSaves = savedKicks.length > 0;

  const patterns = [
    `สรุปผลการแข่งขัน: ${winnerTeam.name} เฉือนชนะ ${loserTeam.name} ด้วยสกอร์ ${winScore}-${loseScore} ในการดวลจุดโทษตัดสิน! \n\nโดย ${winnerTeam.name} ได้ประตูจาก ${winnerScorers || 'ความสามารถเฉพาะตัวของนักกีฬา'} \n\nทางด้านผู้จัดการทีม ${winnerTeam.managerName || 'ของทีม'} กล่าวชื่นชมความมุ่งมั่นของน้องๆ ทุกคน`,
    `สุดมันส์! ${winnerTeam.name} คว้าชัยเหนือ ${loserTeam.name} ${winScore}-${loseScore} 🔥\n\nเกมการแข่งขันเต็มไปด้วยความกดดัน แต่สุดท้ายเป็น ${winnerTeam.name} ที่แม่นกว่า ยิงเข้าโดย ${winnerScorers || 'นักเตะคนเก่ง'} \n\nผอ. ${winnerTeam.directorName || winnerTeam.name} ยิ้มแก้มปริ พร้อมสนับสนุนทีมต่อไป!`,
    `${winnerTeam.name} แม่นโทษ! เอาชนะ ${loserTeam.name} ไปได้ ${winScore}-${loseScore}\n\n${hasSaves ? 'ผู้รักษาประตูโชว์ซูเปอร์เซฟช่วยทีมไว้ได้' : 'เป็นการดวลที่สูสี'} และปิดท้ายด้วยการยิงของ ${winnerScorers || 'ทีมงานคุณภาพ'} พาทีมเข้ารอบต่อไป!`
  ];

  const randomIndex = Math.floor(Math.random() * patterns.length);
  return patterns[randomIndex];
};

import { LIFF_ID, Match } from '../types';

declare global {
  interface Window {
    liff: any;
  }
}

export const initializeLiff = async () => {
  try {
    if (!window.liff) return;
    await window.liff.init({ liffId: LIFF_ID });
    if (!window.liff.isLoggedIn()) {
      // Optional: Auto login or just let them login when clicking share
      // window.liff.login(); 
    }
  } catch (error) {
    console.error('LIFF Init Failed', error);
  }
};

export const shareMatch = async (match: Match, teamAName: string, teamBName: string, teamALogo: string, teamBLogo: string) => {
  if (!window.liff) {
      alert("LIFF SDK not loaded");
      return;
  }
  if (!window.liff.isLoggedIn()) {
      window.liff.login();
      return;
  }

  const isFinished = !!match.winner;
  const title = isFinished ? "ผลการแข่งขัน" : "โปรแกรมการแข่งขัน";
  const headerColor = isFinished ? "#166534" : "#1e40af"; // Green for result, Blue for schedule
  const statusText = isFinished ? "จบการแข่งขัน" : "กำลังจะเริ่ม";
  
  // Format Date
  const dateObj = new Date(match.scheduledTime || match.date);
  const dateStr = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const flexMessage = {
    type: "flex",
    altText: `${title}: ${teamAName} vs ${teamBName}`,
    contents: {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": title,
            "color": "#ffffff",
            "weight": "bold",
            "size": "lg"
          },
          {
            "type": "text",
            "text": match.roundLabel || "ทั่วไป",
            "color": "#e0e7ff",
            "size": "xs"
          }
        ],
        "backgroundColor": headerColor,
        "paddingAll": "lg"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "image",
                    "url": teamALogo || "https://via.placeholder.com/100?text=A",
                    "size": "md",
                    "aspectMode": "cover",
                    "aspectRatio": "1:1",
                    "action": { "type": "uri", "uri": "https://liff.line.me/" + LIFF_ID }
                  },
                  {
                    "type": "text",
                    "text": teamAName,
                    "align": "center",
                    "size": "xs",
                    "wrap": true,
                    "weight": "bold",
                    "margin": "sm"
                  }
                ],
                "width": "35%"
              },
              {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "text": isFinished ? `${match.scoreA} - ${match.scoreB}` : "VS",
                    "weight": "bold",
                    "size": isFinished ? "xl" : "lg",
                    "align": "center",
                    "color": isFinished ? "#000000" : "#aaaaaa"
                  },
                  {
                    "type": "text",
                    "text": statusText,
                    "size": "xxs",
                    "color": "#aaaaaa",
                    "align": "center",
                    "margin": "xs"
                  }
                ],
                "width": "30%",
                "justifyContent": "center"
              },
              {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "image",
                    "url": teamBLogo || "https://via.placeholder.com/100?text=B",
                    "size": "md",
                    "aspectMode": "cover",
                    "aspectRatio": "1:1"
                  },
                  {
                    "type": "text",
                    "text": teamBName,
                    "align": "center",
                    "size": "xs",
                    "wrap": true,
                    "weight": "bold",
                    "margin": "sm"
                  }
                ],
                "width": "35%"
              }
            ]
          },
          {
            "type": "separator",
            "margin": "lg"
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  { "type": "text", "text": "วันที่", "size": "xs", "color": "#aaaaaa", "flex": 1 },
                  { "type": "text", "text": dateStr, "size": "xs", "color": "#666666", "flex": 3 }
                ],
                "margin": "sm"
              },
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  { "type": "text", "text": "เวลา", "size": "xs", "color": "#aaaaaa", "flex": 1 },
                  { "type": "text", "text": timeStr + " น.", "size": "xs", "color": "#666666", "flex": 3 }
                ],
                "margin": "sm"
              },
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  { "type": "text", "text": "สนาม", "size": "xs", "color": "#aaaaaa", "flex": 1 },
                  { "type": "text", "text": match.venue || "ไม่ระบุ", "size": "xs", "color": "#666666", "flex": 3 }
                ],
                "margin": "sm"
              }
            ],
            "margin": "lg"
          }
        ],
        "paddingAll": "lg"
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "button",
            "action": {
              "type": "uri",
              "label": "ดูรายละเอียด",
              "uri": "https://liff.line.me/" + LIFF_ID
            },
            "style": "primary",
            "color": headerColor
          }
        ]
      }
    }
  };

  try {
    const res = await window.liff.shareTargetPicker([flexMessage]);
    if (res) {
      console.log("Shared successfully");
    }
  } catch (error) {
    console.error("Share failed", error);
    alert("แชร์ไม่สำเร็จ: " + error);
  }
};
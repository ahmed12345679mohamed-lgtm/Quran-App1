
import { GoogleGenAI } from "@google/genai";
import { DailyLog } from '../types';

// Helper to initialize the client securely
const getGenAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found. Gemini features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateEncouragement = async (studentName: string, log: DailyLog): Promise<string> => {
  const ai = getGenAIClient();
  if (!ai) return "عذراً، خدمة الذكاء الاصطناعي غير متوفرة حالياً.";

  const formatAssignment = (a: any) => {
    if (a.type === 'RANGE') {
      return `من سورة ${a.name} إلى سورة ${a.endName}`;
    } else if (a.type === 'SURAH') {
      return `سورة ${a.name} (الآيات ${a.ayahFrom}-${a.ayahTo})`;
    } else {
      return `${a.name}`;
    }
  };

  const jadeedText = log.jadeed ? formatAssignment(log.jadeed) : 'لا يوجد حفظ جديد';

  const murajaahText = log.murajaah && log.murajaah.length > 0
    ? log.murajaah.map(m => `${formatAssignment(m)} (تقدير: ${m.grade})`).join('، و ')
    : 'لا توجد مراجعة اليوم';

  const prompt = `
    بصفتك مساعدًا لمعلم القرآن الكريم، اكتب رسالة قصيرة ومشجعة جداً (لا تتجاوز 30 كلمة) موجهة لولي أمر الطالب "${studentName}".
    
    تفاصيل اليوم:
    - الحفظ الجديد: ${jadeedText} - التقدير: ${log.jadeed?.grade || 'N/A'}.
    - المراجعة: ${murajaahText}.
    
    اجعل الرسالة إيجابية وتحفز الطالب على الاستمرار، باللغة العربية الفصحى البسيطة.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "بارك الله فيكم ونفع بكم.";
  } catch (error) {
    console.error("Error generating encouragement:", error);
    return "بارك الله في جهودكم، نرجو المزيد من الاهتمام بالمراجعة.";
  }
};


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
  if (!ai) return "عذراً، خدمة الذكاء الاصطناعي غير متوفرة. يرجى التأكد من إعدادات التطبيق.";

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
    ? log.murajaah.map(m => `${formatAssignment(m)}`).join('، و ')
    : 'لا توجد مراجعة';

  const prompt = `
    أنت مساعد لمعلم القرآن الكريم. اكتب رسالة قصيرة جداً (سطرين أو ثلاثة كحد أقصى) لولي أمر الطالب "${studentName}" لإرسالها عبر واتساب.
    
    المعطيات:
    - الحفظ الجديد: ${jadeedText}
    - المراجعة: ${murajaahText}
    
    الشروط:
    1. ابدأ بعبارة تحفيزية قوية (مثال: "بوركت جهود بطلنا..." أو "ما شاء الله...").
    2. لا تذكر تفاصيل الحفظ والمراجعة في نص الرسالة (لأنها ستكون مذكورة في التقرير)، بل ركز فقط على *المدح* أو *النصيحة* بناءً على الأداء.
    3. اختم بدعاء قصير.
    4. بدون مقدمات أو عناوين.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "بارك الله في جهودكم ونفع بكم.";
  } catch (error) {
    console.error("Error generating encouragement:", error);
    return "بارك الله في جهودكم، نرجو المزيد من الاهتمام بالمراجعة ليكون الحفظ متقناً.";
  }
};

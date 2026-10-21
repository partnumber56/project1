import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// High limit for camera photos and high-res image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
    timeout: 15000,
    retryOptions: {
      attempts: 2,
    },
  },
});

// Resilient models for image recognition (falls back gracefully if a model experiences high demand)
const VISION_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

async function runGeminiVisionWithFallback(
  parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }>,
  prompt: string
): Promise<string> {
  let lastError: any = null;

  for (const model of VISION_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              ...parts,
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`[Gemini Vision] Model ${model} returned error/unavailable:`, err?.message || err?.status || err);
      lastError = err;
    }
  }

  throw lastError || new Error('Всі моделі розпізнавання повернули помилку');
}

function parseJsonSafely<T>(rawText: string, fallback: T): T {
  if (!rawText || !rawText.trim()) return fallback;
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)) as T;
      } catch (inner) {
        console.warn('Failed secondary JSON parse:', inner);
      }
    }
    return fallback;
  }
}

// Endpoint: Parse Tech Passport (Свідоцтво про реєстрацію ТЗ)
app.post('/api/ai/parse-techpassport', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(200).json({ success: false, error: 'Зображення не надано (imageBase64 is required)' });
    }

    if (!apiKey) {
      return res.status(200).json({ success: false, error: 'GEMINI_API_KEY is not configured on the server' });
    }

    // Strip header prefix if sent
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const prompt = `Ти експерт з аналізу автомобільних реєстраційних документів (Свідоцтво про реєстрацію транспортного засобу / Техпаспорт України та країн ЄС).
Уважно проаналізуй прикріплене зображення техпаспорта або його фотографію.
Знайди та витягни такі поля:
- carModel: Марка і модель автомобіля (наприклад: "Volkswagen Passat", "BMW X5", "Skoda Octavia", "Renault Megane", "Toyota Camry", "Audi A6"). Об'єднай марку (D.1) та модель/комерційне найменування (D.3 або D.2) у зрозумілий рядок.
- vin: 17-значний номер кузова / шасі (VIN-код, графа E). Обов'язково приведи до верхнього регістру, без пробілів та спецсимволів. Лише валідні 17 латинських символів.
- year: Рік випуску автомобіля (графа B, наприклад "2016").
- engine: Об'єм двигуна у літрах чи см³ або тип двигуна (графа P.1, наприклад "1968 см³" або "2.0 TDI" або "2.0").
- plateNumber: Державний номерний знак автомобіля (графа A, наприклад "КА1234АА").
- ownerName: Прізвище, ім'я та по батькові власника (графа C.1 / C.2), якщо його чітко видно.

Поверни результат ВИКЛЮЧНО у форматі JSON за такою схемою:
{
  "carModel": string,
  "vin": string,
  "year": string,
  "engine": string,
  "plateNumber": string,
  "ownerName": string,
  "confidence": "high" | "medium" | "low",
  "notes": string
}
Якщо якесь поле не вказано або не читається, поверни для нього порожній рядок "".`;

    const rawText = await runGeminiVisionWithFallback(
      [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
      ],
      prompt
    );

    const defaultPassport = {
      carModel: '',
      vin: '',
      year: '',
      engine: '',
      plateNumber: '',
      ownerName: '',
      confidence: 'medium',
      notes: ''
    };

    const data = parseJsonSafely(rawText, defaultPassport);
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.warn('[TechPassport Parse Notice]:', error?.message || error);
    return res.status(200).json({ 
      success: false,
      error: 'Сервіс розпізнавання зараз перевантажений. Спробуйте ще раз за хвилину або введіть дані авто вручну.',
      details: String(error?.message || error)
    });
  }
});

// Endpoint: Parse Parts List from Photo (Фото рукописного списку, накладної, чека, скріншоту або прайсу)
app.post('/api/ai/parse-parts-photo', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(200).json({ success: false, error: 'Зображення не надано (imageBase64 is required)' });
    }

    if (!apiKey) {
      return res.status(200).json({ success: false, error: 'GEMINI_API_KEY is not configured on the server' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const prompt = `Ти висококваліфікований менеджер з підбору автозапчастин та спеціаліст СТО.
Проаналізуй фотографію списку запчастин. Це може бути:
- Рукописний список майстра або клієнта
- Накладна, чек або замовлення-наряд від постачальника чи СТО
- Скріншот листування у Viber / Telegram / WhatsApp
- Друкований прайс-лист або рахунок-фактура

Витягни ВСІ знайдені деталі/запчастини. Для кожного рядка визнач:
- productName: Назва деталі українською мовою або мовою оригіналу (наприклад: "Фільтр масляний", "Колодки гальмівні передні", "Свічка запалювання", "Амортизатор передній правий", "Ремінь генератора").
- partNumber: Артикул / каталожний номер / SKU (наприклад: "OC 90", "GDB1330", "12290-R1A-H01", "VKMC 01113"). Якщо артикул відсутній, залиш рядок "".
- brand: Бренд / виробник (наприклад: "Knecht/Mahle", "Bosch", "TRW", "Brembo", "Lemforder", "VAG"), якщо вказано або зрозуміло з тексту.
- quantity: Кількість штук як число (за замовчуванням 1, якщо вказано "2 шт", "x4", "комплект" - запиши точну кількість).
- estimatedPrice: Число ціни за одиницю (якщо на фото видно ціну в гривнях, інакше null).
- notes: Корисні примітки чи характеристики (наприклад: "передній лівий", "оригінал", "комплект").

Поверни результат ВИКЛЮЧНО у форматі JSON за схемою:
{
  "items": [
    {
      "productName": string,
      "partNumber": string,
      "brand": string,
      "quantity": number,
      "estimatedPrice": number | null,
      "notes": string
    }
  ],
  "rawSummary": string
}
Якщо на зображенні немає запчастин або воно не розбірливе, поверни "items": [] та пояснення в "rawSummary".`;

    const rawText = await runGeminiVisionWithFallback(
      [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
      ],
      prompt
    );

    const defaultPartsResult = {
      items: [],
      rawSummary: ''
    };

    const data = parseJsonSafely(rawText, defaultPartsResult);
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.warn('[PartsPhoto Parse Notice]:', error?.message || error);
    return res.status(200).json({ 
      success: false,
      error: 'Сервіс розпізнавання зараз перевантажений. Спробуйте ще раз за хвилину або скористайтесь ручним введенням списку.',
      details: String(error?.message || error)
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

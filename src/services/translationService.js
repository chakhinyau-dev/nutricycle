import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../lib/env';

const genAI = new GoogleGenerativeAI(env.geminiApiKey);

const translationCache = new Map();
const pendingTranslations = new Map();

const normalizeLanguage = (language) => {
  const normalized = (language || 'en').toLowerCase();
  return normalized.startsWith('es') ? 'es' : 'en';
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/Ã¡/g, 'a')
    .replace(/Ã©/g, 'e')
    .replace(/Ã­/g, 'i')
    .replace(/Ã³/g, 'o')
    .replace(/Ãº/g, 'u')
    .replace(/Ã±/g, 'n');

const isSkippableString = (value) => {
  if (typeof value !== 'string') return true;
  if (!value.trim()) return true;
  if (/^(https?:|data:|mailto:|#)/i.test(value)) return true;
  if (/^\d+(\.\d+)?$/.test(value)) return true;
  if (/^[0-9a-f]{6,8}$/i.test(value)) return true;
  return false;
};

const EXACT_TRANSLATIONS = {
  'bowl de quinoa y espinaca': { en: 'Quinoa and Spinach Bowl', es: 'Bowl de Quinoa y Espinaca' },
  'ensalada de pollo con quinoa tostada': { en: 'Chicken Salad with Toasted Quinoa', es: 'Ensalada de pollo con quinoa tostada' },
  'salmon con esparragos y limon': { en: 'Salmon with Asparagus and Lemon', es: 'Salmon con Esparragos y Limon' },
  'poke bowl de arroz con atun mango y aguacate': { en: 'Rice Poke Bowl with Tuna, Mango and Avocado', es: 'Poke bowl de arroz con atun, mango y aguacate' },
  'avena cremosa con cacao y nuez': { en: 'Creamy Oatmeal with Cocoa and Walnut', es: 'Avena cremosa con cacao y nuez' },
  'crema de calabaza con jengibre y lentejas': { en: 'Pumpkin Soup with Ginger and Lentils', es: 'Crema de calabaza con jengibre y lentejas' },
  'tacos de pavo con col morada y pico de gallo': { en: 'Turkey Tacos with Red Cabbage and Pico de Gallo', es: 'Tacos de pavo con col morada y pico de gallo' },
  'yogur griego con frutos rojos y semillas': { en: 'Greek Yogurt with Berries and Seeds', es: 'Yogur griego con frutos rojos y semillas' },
  'tostadas de hummus con huevo y rucula': { en: 'Hummus Toast with Egg and Arugula', es: 'Tostadas de hummus con huevo y rucula' },
  'ensalada de camote naranja y pepitas': { en: 'Sweet Potato, Orange and Pepita Salad', es: 'Ensalada de camote, naranja y pepitas' },
  'curry suave de garbanzos y coco': { en: 'Mild Chickpea and Coconut Curry', es: 'Curry suave de garbanzos y coco' },
  'pasta integral con sardinas y espinacas': { en: 'Whole Wheat Pasta with Sardines and Spinach', es: 'Pasta integral con sardinas y espinacas' },
  'mix de nueces y chocolate oscuro': { en: 'Nut and Dark Chocolate Mix', es: 'Mix de nueces y chocolate oscuro' },
  'batido verde energizante': { en: 'Energizing Green Smoothie', es: 'Batido verde energizante' },
  'receta corta para fase folicular': { en: 'Short Recipe for Follicular Phase', es: 'Receta corta para fase folicular' },
  'como conectar tu fase con tus comidas': { en: 'How to Connect Your Phase with Your Meals', es: 'Como conectar tu fase con tus comidas' },
  'pausa suave para dias menstruales': { en: 'Gentle Pause for Menstrual Days', es: 'Pausa suave para dias menstruales' },
  'movimiento consciente para ovulacion': { en: 'Conscious Movement for Ovulation', es: 'Movimiento consciente para ovulacion' },
  'bienestar menstrual': { en: 'Menstrual Wellness', es: 'Bienestar menstrual' },
  'fertilidad y energia': { en: 'Fertility and Energy', es: 'Fertilidad y energia' },
  'ciclo y nutricion': { en: 'Cycle and Nutrition', es: 'Ciclo y nutricion' },
  'fase menstrual': { en: 'Menstrual Phase', es: 'Fase Menstrual' },
  'fase folicular': { en: 'Follicular Phase', es: 'Fase Folicular' },
  'fase ovulacion': { en: 'Ovulation Phase', es: 'Fase Ovulacion' },
  'fase lutea': { en: 'Luteal Phase', es: 'Fase Lutea' },
  'ingredients': { en: 'Ingredients', es: 'Ingredientes' },
  'ingredients recorded.': { en: 'Ingredients recorded.', es: 'Ingredientes registrados.' },
  'preparation': { en: 'Preparation', es: 'Preparacion' },
};

const PHRASE_REPLACEMENTS = {
  en: [
    ['próxima menstruación', 'next period'],
    ['proxima menstruacion', 'next period'],
    ['basado en tu ciclo', 'based on your cycle'],
    ['día', 'day'],
    ['dias', 'days'],
    ['días', 'days'],
    ['menstruación', 'menstruation'],
    ['menstruacion', 'menstruation'],
    ['ovulación', 'ovulation'],
    ['ovulacion', 'ovulation'],
    ['energia', 'energy'],
    ['energía', 'energy'],
    ['proteina', 'protein'],
    ['proteína', 'protein'],
    ['frutos rojos', 'berries'],
    ['semillas', 'seeds'],
    ['espinacas', 'spinach'],
    ['espinaca', 'spinach'],
    ['quinoa', 'quinoa'],
    ['pollo', 'chicken'],
    ['salmon', 'salmon'],
    ['salmon', 'salmon'],
    ['atun', 'tuna'],
    ['atun', 'tuna'],
    ['aguacate', 'avocado'],
    ['mango', 'mango'],
    ['nueces', 'walnuts'],
    ['nuez', 'walnut'],
    ['cacao', 'cocoa'],
    ['calabaza', 'pumpkin'],
    ['lentejas', 'lentils'],
    ['garbanzos', 'chickpeas'],
    ['rucula', 'arugula'],
    ['rúcula', 'arugula'],
    ['camote', 'sweet potato'],
    ['pepitas', 'pepitas'],
    ['coco', 'coconut'],
    ['sardinas', 'sardines'],
    ['esparragos', 'asparagus'],
    ['espárragos', 'asparagus'],
    ['jengibre', 'ginger'],
    ['ingredientes', 'ingredients'],
    ['instrucciones', 'instructions'],
    ['preparacion', 'preparation'],
    ['fase', 'phase'],
    ['ciclo', 'cycle'],
  ],
  es: [
    ['next period', 'próxima menstruación'],
    ['based on your cycle', 'basado en tu ciclo'],
    ['menstrual phase', 'fase menstrual'],
    ['follicular phase', 'fase folicular'],
    ['ovulation phase', 'fase ovulacion'],
    ['luteal phase', 'fase lutea'],
    ['ingredients', 'ingredientes'],
    ['preparation', 'preparacion'],
    ['how to connect your phase with your meals', 'como conectar tu fase con tus comidas'],
    ['gentle pause for menstrual days', 'pausa suave para dias menstruales'],
    ['conscious movement for ovulation', 'movimiento consciente para ovulacion'],
    ['short recipe for follicular phase', 'receta corta para fase folicular'],
    ['energizing green smoothie', 'batido verde energizante'],
  ],
};

const replaceByRules = (text, rules) => {
  let output = text;
  for (const [source, target] of rules) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), target);
  }
  return output;
};

const translateLocally = (text, targetLanguage) => {
  if (typeof text !== 'string' || !text.trim()) return text;
  const normalizedLanguage = normalizeLanguage(targetLanguage);
  const normalizedText = normalizeText(text);
  const exact = EXACT_TRANSLATIONS[normalizedText];
  if (exact?.[normalizedLanguage]) return exact[normalizedLanguage];

  const rules = PHRASE_REPLACEMENTS[normalizedLanguage] || [];
  const translated = replaceByRules(text, rules);
  return translated === text ? text : translated;
};

const translateWithAI = async (text, targetLanguage) => {
  if (!env.geminiApiKey || isSkippableString(text)) return text;

  const normalizedLanguage = normalizeLanguage(targetLanguage);
  const cacheKey = `ai:${normalizedLanguage}:${text}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
  if (pendingTranslations.has(cacheKey)) return pendingTranslations.get(cacheKey);

  const task = (async () => {
    const targetName = normalizedLanguage === 'es' ? 'Spanish' : 'English';
    const prompt = `Translate the following text into ${targetName}. Return only the translated text and nothing else.\nText: ${text}`;

    const modelIds = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'];
    for (const modelId of modelIds) {
      try {
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const out = response.text()?.trim();
        if (out) {
          return out.replace(/^["']|["']$/g, '');
        }
      } catch (error) {
        console.warn(`[Translation] text error for ${modelId}:`, error.message);
      }
    }

    return text;
  })();

  pendingTranslations.set(cacheKey, task);
  try {
    const value = await task;
    translationCache.set(cacheKey, value);
    return value;
  } finally {
    pendingTranslations.delete(cacheKey);
  }
};

const translateString = async (text, targetLanguage) => {
  if (isSkippableString(text)) return text;
  const normalizedLanguage = normalizeLanguage(targetLanguage);
  const cacheKey = `string:${normalizedLanguage}:${text}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
  if (pendingTranslations.has(cacheKey)) return pendingTranslations.get(cacheKey);

  const task = (async () => {
    const local = translateLocally(text, normalizedLanguage);
    if (local && local !== text) {
      translationCache.set(cacheKey, local);
      return local;
    }

    const ai = await translateWithAI(text, normalizedLanguage);
    if (ai && ai !== text) {
      translationCache.set(cacheKey, ai);
      return ai;
    }

    const fallback = translateLocally(text, normalizedLanguage);
    translationCache.set(cacheKey, fallback);
    return fallback;
  })();

  pendingTranslations.set(cacheKey, task);
  try {
    const value = await task;
    translationCache.set(cacheKey, value);
    return value;
  } finally {
    pendingTranslations.delete(cacheKey);
  }
};

const translateArray = async (items, targetLanguage) => {
  if (!Array.isArray(items)) return items;
  return Promise.all(items.map((item) => translateString(item, targetLanguage)));
};

const translateAdminObject = async (data, targetLanguage) => {
  const normalizedLanguage = normalizeLanguage(targetLanguage);
  const cacheKey = `obj:${normalizedLanguage}:${JSON.stringify(data)}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
  if (pendingTranslations.has(cacheKey)) return pendingTranslations.get(cacheKey);

  const task = (async () => {
    const translated = { ...data };

    if (typeof data.title === 'string') {
      translated.title = await translateString(data.title, normalizedLanguage);
    }

    if (typeof data.category === 'string') {
      translated.category = await translateString(data.category, normalizedLanguage);
    }

    if (typeof data.description === 'string') {
      translated.description = await translateString(data.description, normalizedLanguage);
    }

    if (typeof data.nutritionalInsight === 'string') {
      translated.nutritionalInsight = await translateString(data.nutritionalInsight, normalizedLanguage);
    }

    if (typeof data.excerpt === 'string') {
      translated.excerpt = await translateString(data.excerpt, normalizedLanguage);
    }

    if (typeof data.tag === 'string') {
      translated.tag = await translateString(data.tag, normalizedLanguage);
    }

    if (typeof data.subtitle === 'string') {
      translated.subtitle = await translateString(data.subtitle, normalizedLanguage);
    }

    if (Array.isArray(data.ingredients)) {
      translated.ingredients = await translateArray(data.ingredients, normalizedLanguage);
    }

    if (Array.isArray(data.instructions)) {
      translated.instructions = await translateArray(data.instructions, normalizedLanguage);
    }

    if (Array.isArray(data.steps)) {
      translated.steps = await translateArray(data.steps, normalizedLanguage);
    }

    translationCache.set(cacheKey, translated);
    return translated;
  })();

  pendingTranslations.set(cacheKey, task);
  try {
    const value = await task;
    translationCache.set(cacheKey, value);
    return value;
  } finally {
    pendingTranslations.delete(cacheKey);
  }
};

export const translateContent = async (data, targetLanguage) => {
  if (!data || !targetLanguage) return data;
  return translateAdminObject(data, targetLanguage);
};

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Gemini Initialization Helper
const getAI = () => {
  let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "your-api-key") {
    throw new Error("Gemini API Key is missing. Please go to the 'Settings' menu (gear icon) -> 'Secrets' and add a variable named GEMINI_API_KEY with your key from https://aistudio.google.com/app/apikey");
  }

  // Sanitize the key (remove quotes, whitespace, or accidental prefixes)
  apiKey = apiKey.trim().replace(/^['"]|['"]$/g, '');
  if (apiKey.includes('=')) {
    apiKey = apiKey.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  }

  if (!apiKey.startsWith("AIza")) {
    throw new Error("The provided GEMINI_API_KEY does not appear to be a valid Google API key (should start with 'AIza'). Please check your key in Settings > Secrets.");
  }

  console.log(`[AI] Initializing with key length: ${apiKey.length}, prefix: ${apiKey.substring(0, 4)}...`);

  return new GoogleGenAI({ apiKey });
};

// Simple Rate Limiting (In-memory for MVP)
const usageStore = new Map<string, { count: number, date: string }>();

const checkRateLimit = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || 'anonymous';
  const today = new Date().toISOString().split('T')[0];
  
  const usage = usageStore.get(ip) || { count: 0, date: today };
  
  if (usage.date !== today) {
    usage.count = 0;
    usage.date = today;
  }
  
  if (usage.count >= 3) {
    return res.status(429).json({ error: "Daily limit of 3 generations reached. Please try again tomorrow." });
  }
  
  usageStore.set(ip, usage);
  next();
};

// API Routes
app.post("/api/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  // If the URL is already an image, return it directly to avoid unnecessary AI calls
  if (url.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i) || url.includes('assets.myntassets.com')) {
    const fileName = url.split('/').pop()?.split('?')[0] || "Product";
    const name = fileName
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\.(jpg|jpeg|png|webp|gif|avif)$/i, '')
      .trim();
    
    return res.json({
      name: name || "Product Image",
      category: "Clothing",
      color: "Unknown",
      imageUrl: url,
      description: "Product image from URL",
      brand: "Unknown"
    });
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract product details from this e-commerce URL: ${url}. 
      Return the product name, category (e.g., Topwear, Bottomwear, Dress), primary color, a valid image URL for the product, and a brief description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            color: { type: Type.STRING },
            imageUrl: { type: Type.STRING },
            description: { type: Type.STRING },
            brand: { type: Type.STRING },
          },
          required: ["name", "category", "color", "imageUrl", "description"],
        },
        tools: [{ urlContext: {} }]
      },
    });
    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Scrape Error:", error);
    res.status(500).json({ error: error.message || "Failed to scrape product" });
  }
});

app.post("/api/generate", checkRateLimit, async (req, res) => {
  const { userImageBase64, productDetails, profile } = req.body;
  const ip = req.ip || 'anonymous';
  
  try {
    const ai = getAI();
    // Fetch product image as base64
    const imgRes = await fetch(productDetails.imageUrl);
    const blob = await imgRes.blob();
    const buffer = await blob.arrayBuffer();
    const productImageBase64 = Buffer.from(buffer).toString('base64');

    const systemPrompt = `System Role: You are a professional high-fidelity fashion visualization and virtual try-on engine.
    Task: Perform a virtual try-on by REPLACING the current clothing of the person in the FIRST image with the garment shown in the SECOND image.
    1. CLOTHING REPLACEMENT (MANDATORY): You MUST remove the existing top/bottom/dress the person is wearing in the first image. Replace it COMPLETELY with the garment from the second image.
    2. IDENTITY PRESERVATION: The person in the generated image MUST be the EXACT same individual from the first image.
    3. Anatomy & Fit: Adjust the garment's fit to match the user's ${profile.bodyType} build and ${profile.height} height.
    4. Garment Fidelity: Maintain the exact ${productDetails.color}, pattern, and texture of the garment from the second image.
    5. Pose & Background: Maintain the original pose and background from the first image exactly.`;

    const userPrompt = `
      Virtual Try-On Request:
      - User: ${profile.gender}, ${profile.height}, ${profile.bodyType} build.
      - Product: ${productDetails.brand || 'Brand'} ${productDetails.name} (${productDetails.category}).
      - Action: Replace the user's current outfit with this ${productDetails.color} ${productDetails.category}. 
    `;

    const parts: any[] = [
      { text: systemPrompt + userPrompt },
      {
        inlineData: {
          data: userImageBase64.split(',')[1],
          mimeType: "image/png",
        },
      },
      {
        inlineData: {
          data: productImageBase64,
          mimeType: "image/png",
        },
      }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });

    let generatedImage = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        generatedImage = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedImage) throw new Error("No image generated");

    // Increment usage count
    const usage = usageStore.get(ip)!;
    usage.count++;
    usageStore.set(ip, usage);

    res.json({ image: generatedImage });
  } catch (error: any) {
    console.error("Generate Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});

app.post("/api/analyze", async (req, res) => {
  const { generatedImageBase64, productDetails, profile } = req.body;
  try {
    const ai = getAI();
    const prompt = `Compare the generated try-on image with the user's provided measurements (${profile.height}/${profile.weight}). 
    Identify areas where the garment might feel tight or loose. 
    Provide a 'Fit Score' out of 100, size recommendation, 3 styling tips, and 2-3 fit badges.
    User Profile: ${JSON.stringify(profile)}
    Product: ${productDetails.name} (${productDetails.category})`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: generatedImageBase64.split(',')[1],
              mimeType: "image/png",
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fitScore: { type: Type.NUMBER },
            sizeRecommendation: { type: Type.STRING },
            stylingTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            fitBadges: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
          },
          required: ["fitScore", "sizeRecommendation", "stylingTips", "fitBadges"],
        },
      },
    });
    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Analyze Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze fit" });
  }
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

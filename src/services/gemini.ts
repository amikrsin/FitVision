import { ProductDetails, BodyProfile, FitAnalysis } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

// Fallback direct Gemini client for static-only deployments
const getDirectAI = () => {
  const apiKey = (process as any).env?.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export async function scrapeProductUrl(url: string): Promise<ProductDetails> {
  // Try backend first
  try {
    const response = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    
    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      }
    }
    
    // If 404 or 405, we might be on a static host, try direct fallback
    if (response.status === 404 || response.status === 405) {
      return scrapeDirectly(url);
    }

    const text = await response.text();
    throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
  } catch (err: any) {
    if (err.message.includes('404') || err.message.includes('405')) {
      return scrapeDirectly(url);
    }
    throw err;
  }
}

async function scrapeDirectly(url: string): Promise<ProductDetails> {
  console.log("[AI] Falling back to direct browser scraping...");
  
  // Direct image URL optimization
  if (url.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i) || url.includes('assets.myntassets.com')) {
    const fileName = url.split('/').pop()?.split('?')[0] || "Product";
    const name = fileName.replace(/[-_]/g, ' ').replace(/\.(jpg|jpeg|png|webp|gif|avif)$/i, '').trim();
    return {
      name: name || "Product Image",
      category: "Clothing",
      color: "Unknown",
      imageUrl: url,
      description: "Product image from URL",
      brand: "Unknown"
    };
  }

  const ai = getDirectAI();
  if (!ai) throw new Error("Backend API is unavailable (405) and no GEMINI_API_KEY found for direct fallback.");

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

  const text = response.text;
  if (!text) throw new Error("AI returned an empty response");
  return JSON.parse(text);
}

export async function generateTryOnImage(
  userImageBase64: string,
  productDetails: ProductDetails,
  profile: BodyProfile
): Promise<string> {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userImageBase64, productDetails, profile }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.image;
    }

    if (response.status === 404 || response.status === 405) {
      return generateDirectly(userImageBase64, productDetails, profile);
    }
    
    const error = await response.json();
    throw new Error(error.error || "Failed to generate image");
  } catch (err: any) {
    if (err.message.includes('404') || err.message.includes('405')) {
      return generateDirectly(userImageBase64, productDetails, profile);
    }
    throw err;
  }
}

async function generateDirectly(
  userImageBase64: string,
  productDetails: ProductDetails,
  profile: BodyProfile
): Promise<string> {
  console.log("[AI] Falling back to direct browser generation...");
  const ai = getDirectAI();
  if (!ai) throw new Error("Backend API is unavailable (405) and no GEMINI_API_KEY found for direct fallback.");

  // Fetch product image as base64
  const imgRes = await fetch(productDetails.imageUrl);
  const blob = await imgRes.blob();
  const buffer = await blob.arrayBuffer();
  const productImageBase64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

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

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

export async function analyzeFit(
  generatedImageBase64: string,
  productDetails: ProductDetails,
  profile: BodyProfile
): Promise<FitAnalysis> {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generatedImageBase64, productDetails, profile }),
    });
    
    if (response.ok) {
      return response.json();
    }

    if (response.status === 404 || response.status === 405) {
      return analyzeDirectly(generatedImageBase64, productDetails, profile);
    }

    const error = await response.json();
    throw new Error(error.error || "Failed to analyze fit");
  } catch (err: any) {
    if (err.message.includes('404') || err.message.includes('405')) {
      return analyzeDirectly(generatedImageBase64, productDetails, profile);
    }
    throw err;
  }
}

async function analyzeDirectly(
  generatedImageBase64: string,
  productDetails: ProductDetails,
  profile: BodyProfile
): Promise<FitAnalysis> {
  console.log("[AI] Falling back to direct browser analysis...");
  const ai = getDirectAI();
  if (!ai) throw new Error("Backend API is unavailable (405) and no GEMINI_API_KEY found for direct fallback.");

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
  
  const text = response.text;
  if (!text) throw new Error("AI returned an empty response");
  return JSON.parse(text);
}

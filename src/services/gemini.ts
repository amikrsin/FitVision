import { GoogleGenAI, Type } from "@google/genai";
import { ProductDetails, BodyProfile, FitAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function scrapeProductUrl(url: string): Promise<ProductDetails> {
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

  return JSON.parse(response.text);
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url, { mode: 'no-cors' });
    // Note: 'no-cors' will return an opaque response which doesn't allow reading the body.
    // To actually read the image data, the server must support CORS.
    // For this demo, we'll try a standard fetch first.
    const corsResponse = await fetch(url);
    const blob = await corsResponse.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("CORS issue fetching product image. Falling back to text-only description for product.", error);
    return "";
  }
}

export async function generateTryOnImage(
  userImageBase64: string,
  productDetails: ProductDetails,
  profile: BodyProfile
): Promise<string> {
  const productImageBase64 = await fetchImageAsBase64(productDetails.imageUrl);

  const systemPrompt = `System Role: You are a professional high-fidelity fashion visualization and virtual try-on engine.
  
  Task: Perform a virtual try-on by replacing the clothes of the person in [User_Image] with the garment shown in [Product_Image].
  
  Strict Execution Constraints:
  1. IDENTITY PRESERVATION (CRITICAL): The person in the generated image MUST be the EXACT same individual from [User_Image]. Preserve their face, facial hair, hairstyle, skin tone, and unique features with 100% accuracy. Do NOT replace them with a generic model.
  2. Anatomy & Fit: Adjust the garment's fit to match the user's ${profile.bodyType} build and ${profile.height} height. The fabric should drape naturally over their specific body shape.
  3. Garment Fidelity: Maintain the exact ${productDetails.color}, pattern, and texture of the garment from [Product_Image]. Keep the original neckline, sleeves, and details.
  4. Pose & Background: Maintain the original pose and background from [User_Image] to ensure a realistic "in-situ" try-on experience, but enhance the lighting to professional catalog quality.
  5. Quality: 8k resolution, cinematic lighting, sharp focus, photorealistic textures.`;

  const userPrompt = `
    Virtual Try-On Request:
    - User: ${profile.gender}, ${profile.height}, ${profile.bodyType} build.
    - Product: ${productDetails.brand || 'Brand'} ${productDetails.name} (${productDetails.category}).
    - Action: Replace the user's current outfit with this ${productDetails.color} ${productDetails.category}. 
    - Note: Ensure the person remains exactly who they are in the reference photo.
  `;

  const parts: any[] = [
    { text: systemPrompt + userPrompt },
    {
      inlineData: {
        data: userImageBase64.split(',')[1],
        mimeType: "image/png",
      },
    },
  ];

  if (productImageBase64) {
    parts.push({
      inlineData: {
        data: productImageBase64,
        mimeType: "image/png",
      },
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Failed to generate image");
}

export async function analyzeFit(
  generatedImageBase64: string,
  productDetails: ProductDetails,
  profile: BodyProfile
): Promise<FitAnalysis> {
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

  return JSON.parse(response.text);
}

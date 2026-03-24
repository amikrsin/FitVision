import { ProductDetails, BodyProfile, FitAnalysis } from "../types";

export async function scrapeProductUrl(url: string): Promise<ProductDetails> {
  const response = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to scrape product");
  }
  return response.json();
}

export async function generateTryOnImage(
  userImageBase64: string,
  productDetails: ProductDetails,
  profile: BodyProfile
): Promise<string> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userImageBase64, productDetails, profile }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate image");
  }
  const data = await response.json();
  return data.image;
}

export async function analyzeFit(
  generatedImageBase64: string,
  productDetails: ProductDetails,
  profile: BodyProfile
): Promise<FitAnalysis> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generatedImageBase64, productDetails, profile }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to analyze fit");
  }
  return response.json();
}

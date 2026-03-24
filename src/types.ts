export interface ProductDetails {
  name: string;
  category: string;
  color: string;
  imageUrl: string;
  description: string;
  brand?: string;
}

export interface BodyProfile {
  gender: 'male' | 'female' | 'other';
  height: string;
  weight: string;
  bodyType: string;
  skinTone: string;
  preferredSize: string;
}

export interface FitAnalysis {
  fitScore: number;
  sizeRecommendation: string;
  stylingTips: string[];
  fitBadges: string[];
}

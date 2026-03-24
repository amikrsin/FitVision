# FitVision | AI-Powered Virtual Try-On & Fit Analysis

FitVision is a cutting-edge web application that leverages Gemini AI to revolutionize the online shopping experience. By allowing users to virtually "try on" clothes from any e-commerce URL, FitVision provides instant visual feedback and personalized fit recommendations.

## Key Features

- **Universal Product Scraper:** Paste a link from any major e-commerce site (Myntra, Amazon, Zara, etc.) to instantly extract product details and images.
- **Virtual Try-On:** Upload a full-body photo or use your device's camera to see yourself in the selected outfit.
- **AI Fit Analysis:** Receive a "Fit Score" and personalized size recommendations based on your body profile and the garment's characteristics.
- **Styling Tips:** Get AI-generated styling advice to complete your look.
- **Privacy-First Design:** Photos are processed in-memory and never stored on servers, ensuring user data remains private and secure.
- **PWA Support:** Installable on mobile devices for a native-like experience with offline capabilities.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Motion (for animations).
- **AI Engine:** Google Gemini AI (Multimodal).
- **Build Tool:** Vite with PWA support.
- **Icons:** Lucide React.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Google Gemini API Key

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Privacy & Security

FitVision is designed with user privacy in mind. All image processing is handled via the Gemini API, and user photos are never stored on our servers. The application uses secure, in-memory processing for all virtual try-on operations.

## License

MIT License - feel free to use and modify for your own projects!

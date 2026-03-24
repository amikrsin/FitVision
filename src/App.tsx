import { useState } from 'react';
import { Sparkles, Shirt, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductScraper } from './components/ProductScraper';
import { PhotoUpload } from './components/PhotoUpload';
import { BodyProfileForm } from './components/BodyProfileForm';
import { TryOnResult } from './components/TryOnResult';
import { ProductDetails, BodyProfile, FitAnalysis } from './types';
import { generateTryOnImage, analyzeFit } from './services/gemini';

export default function App() {
  const [step, setStep] = useState(1);
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [profile, setProfile] = useState<BodyProfile>({
    gender: 'female',
    height: '',
    weight: '',
    bodyType: 'Average',
    skinTone: 'Medium',
    preferredSize: 'M',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FitAnalysis | null>(null);

  const handleTryOn = async () => {
    if (!photo || !product) return;
    
    setIsGenerating(true);
    try {
      const generated = await generateTryOnImage(photo, product, profile);
      setResultImage(generated);
      
      const fitAnalysis = await analyzeFit(generated, product, profile);
      setAnalysis(fitAnalysis);
      setStep(4);
    } catch (error) {
      console.error(error);
      alert("Something went wrong during generation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setStep(1);
    setProduct(null);
    setResultImage(null);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Shirt size={18} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">FITVISION</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <span className={step >= 1 ? "text-zinc-900" : ""}>Product</span>
              <ChevronRight size={10} />
              <span className={step >= 2 ? "text-zinc-900" : ""}>Profile</span>
              <ChevronRight size={10} />
              <span className={step >= 3 ? "text-zinc-900" : ""}>Try-On</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step < 4 ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-12"
            >
              <div className="text-center space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[0.9]">
                  See yourself in <span className="italic font-serif text-zinc-400">anything.</span>
                </h1>
                <p className="text-zinc-500 text-lg max-w-md mx-auto">
                  Virtual try-on powered by Gemini AI. Paste a link, upload a photo, and get instant fit analysis.
                </p>
              </div>

              <div className="space-y-10">
                {/* Step 1: Product */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold">1</div>
                    <h2 className="text-lg font-bold">Choose your outfit</h2>
                  </div>
                  
                  <ProductScraper onScraped={(details) => {
                    setProduct(details);
                    setStep(2);
                  }} />

                  {product && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100"
                    >
                      <img src={product.imageUrl} alt={product.name} className="w-20 h-20 object-cover rounded-xl" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{product.brand || 'Product'}</p>
                        <h3 className="font-bold truncate">{product.name}</h3>
                        <p className="text-sm text-zinc-500 line-clamp-1">{product.description}</p>
                      </div>
                    </motion.div>
                  )}
                </section>

                {/* Step 2: Profile */}
                {step >= 2 && (
                  <motion.section 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6 pt-6 border-t border-zinc-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold">2</div>
                      <h2 className="text-lg font-bold">Your body profile</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <PhotoUpload photo={photo} onUpload={(b64) => {
                        setPhoto(b64);
                        if (b64) setStep(3);
                      }} />
                      <div className="space-y-6">
                        <BodyProfileForm profile={profile} onChange={setProfile} />
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* Step 3: Action */}
                {step >= 3 && photo && product && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-8 flex justify-center"
                  >
                    <button
                      onClick={handleTryOn}
                      disabled={isGenerating}
                      className="w-full sm:w-auto group relative bg-zinc-900 text-white px-12 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 overflow-hidden"
                    >
                      <div className="relative z-10 flex items-center justify-center gap-3">
                        {isGenerating ? (
                          <>
                            <Loader2 className="animate-spin" size={24} />
                            Generating Look...
                          </>
                        ) : (
                          <>
                            <Sparkles size={24} />
                            Generate Try-On
                          </>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={reset}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
                >
                  <RefreshCw size={18} />
                  Try another outfit
                </button>
                <div className="px-4 py-1.5 bg-zinc-100 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  AI Generated Preview
                </div>
              </div>

              {photo && resultImage && analysis && (
                <TryOnResult 
                  originalImage={photo}
                  generatedImage={resultImage}
                  analysis={analysis}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Shirt size={16} />
            <span className="text-sm font-bold tracking-tighter">FITVISION</span>
          </div>
          <p className="text-xs text-zinc-400">
            © 2026 FitVision AI. For demonstration purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
}

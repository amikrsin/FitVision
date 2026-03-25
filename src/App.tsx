import { useState, useEffect } from 'react';
import { Sparkles, Shirt, Loader2, RefreshCw, ChevronRight, Plus, X, User, Save, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductScraper } from './components/ProductScraper';
import { PhotoUpload } from './components/PhotoUpload';
import { BodyProfileForm } from './components/BodyProfileForm';
import { TryOnResult } from './components/TryOnResult';
import { ProductDetails, BodyProfile, FitAnalysis, StoredProfile } from './types';
import { generateTryOnImage, analyzeFit } from './services/gemini';

export default function App() {
  const [step, setStep] = useState(0); // 0: Intro, 1: Product, 2: Profile, 3: Ready, 4: Result
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
  
  // Profile Management
  const [savedProfiles, setSavedProfiles] = useState<StoredProfile[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    // Check if API key is available
    let key = "";
    try {
      // @ts-ignore
      key = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    } catch (e) {}

    if (!key || key === "undefined" || key === "null" || key === "") {
      setApiKeyMissing(true);
      console.warn("[FitVision] GEMINI_API_KEY is missing in frontend environment.");
    } else {
      console.log("[FitVision] GEMINI_API_KEY detected in frontend environment.");
    }

    // Load profiles
    const stored = localStorage.getItem('fitvision_profiles');
    if (stored) setSavedProfiles(JSON.parse(stored));

    // Load usage
    const today = new Date().toISOString().split('T')[0];
    const usage = localStorage.getItem('fitvision_usage');
    if (usage) {
      const { count, date } = JSON.parse(usage);
      if (date === today) setUsageCount(count);
      else {
        setUsageCount(0);
        localStorage.setItem('fitvision_usage', JSON.stringify({ count: 0, date: today }));
      }
    }
  }, []);

  const saveProfile = (name: string) => {
    if (!photo) return;
    if (savedProfiles.length >= 4) {
      alert("You can save up to 4 profiles.");
      return;
    }
    const newProfile: StoredProfile = {
      id: crypto.randomUUID(),
      name,
      photo,
      profile,
      createdAt: Date.now()
    };
    const updated = [...savedProfiles, newProfile];
    setSavedProfiles(updated);
    localStorage.setItem('fitvision_profiles', JSON.stringify(updated));
  };

  const deleteProfile = (id: string) => {
    const updated = savedProfiles.filter(p => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem('fitvision_profiles', JSON.stringify(updated));
  };

  const selectProfile = (p: StoredProfile) => {
    setPhoto(p.photo);
    setProfile(p.profile);
    setStep(1); // Go to product selection
  };

  const handleTryOn = async () => {
    if (!photo || !product) return;
    if (usageCount >= 3) {
      alert("Daily limit of 3 generations reached. This is an MVP version to protect API usage.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const generated = await generateTryOnImage(photo, product, profile);
      setResultImage(generated);
      
      const fitAnalysis = await analyzeFit(generated, product, profile);
      setAnalysis(fitAnalysis);
      
      // Update usage
      const newCount = usageCount + 1;
      setUsageCount(newCount);
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('fitvision_usage', JSON.stringify({ count: newCount, date: today }));
      
      setStep(4);
    } catch (error: any) {
      console.error(error);
      let message = "Something went wrong during generation. Please try again.";
      
      try {
        // Try to parse JSON error from Gemini API
        const errObj = JSON.parse(error.message);
        if (errObj.error?.code === 429) {
          message = "AI Quota Exceeded: The free tier limit for this AI model has been reached. Please try again in a few minutes or use a different API key.";
        } else if (errObj.error?.message) {
          message = errObj.error.message;
        }
      } catch (e) {
        // Not JSON, use raw message if it's a string
        if (typeof error.message === 'string' && error.message.length > 0) {
          message = error.message;
        }
      }
      
      alert(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setStep(0);
    setProduct(null);
    setPhoto(null);
    setResultImage(null);
    setAnalysis(null);
  };

  const steps = [
    { title: "Find Outfit", icon: <Shirt size={16} /> },
    { title: "Your Profile", icon: <Sparkles size={16} /> },
    { title: "AI Try-On", icon: <RefreshCw size={16} /> }
  ];

  return (
    <div className="flex flex-col h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white overflow-hidden">
      {/* Header */}
      <header className="flex-none z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Shirt size={18} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">FITVISION</span>
          </div>
          
          {step > 0 && step < 4 && (
            <button 
              onClick={reset}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <X size={20} className="text-zinc-400" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-start px-6 pt-12 space-y-8"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-2"
              >
                <Shirt size={40} className="text-zinc-900" />
              </motion.div>

              <div className="space-y-4 text-center">
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl font-bold tracking-tight leading-[0.9]"
                >
                  See yourself in <span className="italic font-serif text-zinc-400">anything.</span>
                </motion.h1>
                <div className="flex items-center justify-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                  <Clock size={12} />
                  {3 - usageCount} Generations left today
                </div>
                {apiKeyMissing && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold uppercase tracking-widest text-center">
                    ⚠️ GEMINI_API_KEY is missing in Secrets. Please add it to Settings &gt; Secrets.
                  </div>
                )}
              </div>

              {/* Saved Profiles Section */}
              {savedProfiles.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="w-full max-w-xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Saved Profiles</h3>
                    <span className="text-[10px] font-bold text-zinc-300">{savedProfiles.length}/4</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {savedProfiles.map((p) => (
                      <div key={p.id} className="group relative">
                        <button
                          onClick={() => selectProfile(p)}
                          className="w-full aspect-square rounded-2xl overflow-hidden border border-zinc-100 hover:border-zinc-900 transition-all bg-zinc-50"
                        >
                          <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                            <p className="text-[10px] font-bold text-white truncate">{p.name}</p>
                          </div>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-zinc-100 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-1 gap-3 w-full max-w-xs pt-4"
              >
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {i + 1}
                    </div>
                    <span className="font-bold text-xs">{s.title}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          ) : step < 4 ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-10 max-w-2xl mx-auto pb-32"
            >
              {/* Step 1: Product */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                    <h2 className="text-lg font-bold">Choose Outfit</h2>
                  </div>
                  {product && <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Selected</span>}
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
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{product.brand || 'Product'}</p>
                      <h3 className="font-bold truncate text-sm">{product.name}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-1">{product.description}</p>
                    </div>
                  </motion.div>
                )}
              </section>

              {/* Step 2: Profile */}
              {step >= 2 && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-6 border-t border-zinc-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                    <h2 className="text-lg font-bold">Your Profile</h2>
                  </div>
                  
                  <div className="space-y-8">
                    <PhotoUpload photo={photo} onUpload={(b64) => {
                      setPhoto(b64);
                      if (b64) setStep(3);
                    }} />
                    <div className="space-y-6">
                      <BodyProfileForm profile={profile} onChange={setProfile} />
                      
                      {photo && savedProfiles.length < 4 && (
                        <button
                          onClick={() => {
                            const name = prompt("Enter a name for this profile:");
                            if (name) saveProfile(name);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 transition-all font-bold text-xs uppercase tracking-widest"
                        >
                          <Save size={14} />
                          Save this profile
                        </button>
                      )}
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Step 3: Action */}
              {step >= 3 && photo && product && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-8"
                >
                  <button
                    onClick={handleTryOn}
                    disabled={isGenerating || usageCount >= 3}
                    className="w-full group relative bg-zinc-900 text-white py-5 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden shadow-xl shadow-zinc-200"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                      {isGenerating ? (
                        <>
                          <Loader2 className="animate-spin" size={24} />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={24} />
                          {usageCount >= 3 ? 'Daily Limit Reached' : 'Generate Try-On'}
                        </>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  {usageCount >= 3 && (
                    <p className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-4">
                      Limit: 3/3 generations used today
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 space-y-8 max-w-2xl mx-auto pb-32"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={reset}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-bold text-[10px] uppercase tracking-widest"
                >
                  <RefreshCw size={14} />
                  Try another
                </button>
                <div className="px-3 py-1 bg-zinc-100 rounded-full text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  AI Generated
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

        {/* Floating Action Button */}
        <AnimatePresence>
          {step === 0 && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setStep(1)}
              className="absolute bottom-8 right-8 w-16 h-16 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-2xl shadow-zinc-400 z-50"
            >
              <Plus size={32} />
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="flex-none py-6 border-t border-zinc-50 bg-white">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 opacity-30">
            <Shirt size={12} />
            <span className="text-[8px] font-black tracking-tighter uppercase">FITVISION</span>
          </div>
          <p className="text-[8px] font-medium text-zinc-400 uppercase tracking-widest">
            © 2026 FitVision AI.
          </p>
        </div>
      </footer>
    </div>
  );
}

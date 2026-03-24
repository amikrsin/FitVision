import { Download, CheckCircle2, Star, Sparkles } from 'lucide-react';
import { FitAnalysis } from '../types';
import { motion } from 'motion/react';

interface TryOnResultProps {
  originalImage: string;
  generatedImage: string;
  analysis: FitAnalysis;
}

export function TryOnResult({ originalImage, generatedImage, analysis }: TryOnResultProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'fitvision-tryon.png';
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Reference</p>
          <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-zinc-100">
            <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">FitVision AI Result</p>
          <div className="aspect-[3/4] rounded-2xl overflow-hidden border-2 border-zinc-900 shadow-xl relative group">
            <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />
            <button
              onClick={handleDownload}
              className="absolute bottom-4 right-4 p-3 bg-zinc-900 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-50 rounded-3xl p-6 md:p-8 space-y-6 border border-zinc-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-900">
              <Star className="fill-zinc-900" size={20} />
              <h3 className="text-2xl font-bold">Fit Analysis</h3>
            </div>
            <p className="text-zinc-500">AI-powered size and styling recommendation</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-zinc-900">{analysis.fitScore}%</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Fit Score</div>
            </div>
            <div className="h-10 w-px bg-zinc-200" />
            <div className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold">
              Size: {analysis.sizeRecommendation}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {analysis.fitBadges.map((badge, i) => (
            <span key={i} className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-xs font-medium text-zinc-700 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-green-600" />
              {badge}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analysis.stylingTips.map((tip, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm flex gap-3"
            >
              <div className="mt-1">
                <Sparkles size={16} className="text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed">{tip}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

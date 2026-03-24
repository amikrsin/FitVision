import { useDropzone } from 'react-dropzone';
import { Upload, X, User, Camera, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useRef, useState } from 'react';

interface PhotoUploadProps {
  photo: string | null;
  onUpload: (base64: string | null) => void;
}

export function PhotoUpload({ photo, onUpload }: PhotoUploadProps) {
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        onUpload(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
          <User size={16} />
          Your Full Body Photo
        </label>
        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-widest">
          <ShieldCheck size={12} />
          Private & Secure
        </div>
      </div>
      
      {photo ? (
        <div className="relative aspect-[3/4] w-full max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-zinc-100 group">
          <img src={photo} alt="User profile" className="w-full h-full object-cover" />
          <button
            onClick={() => onUpload(null)}
            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} className="text-zinc-900" />
          </button>
        </div>
      ) : showCamera ? (
        <div className="relative aspect-[3/4] w-full max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-zinc-900 bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <button
              onClick={capturePhoto}
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-zinc-200"
            />
            <button
              onClick={stopCamera}
              className="absolute right-4 bottom-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            {...getRootProps()}
            className={cn(
              "aspect-[3/4] w-full max-w-xs mx-auto rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
              isDragActive ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"
            )}
          >
            <input {...getInputProps()} />
            <div className="p-4 bg-zinc-100 rounded-full">
              <Upload size={24} className="text-zinc-600" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium text-zinc-900">Click or drag photo</p>
              <p className="text-xs text-zinc-500 mt-1">Full body shot works best</p>
            </div>
          </div>
          <button
            onClick={startCamera}
            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3 border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            <Camera size={18} />
            Take a photo
          </button>
        </div>
      )}
      <p className="text-[10px] text-zinc-400 text-center">
        Your photo is processed locally and never stored on our servers.
      </p>
    </div>
  );
}

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const startWebcam = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Camera access denied.");
    }
  }, []);

  useEffect(() => {
    startWebcam();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(dataUrl);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6">
      <div className="relative w-full max-w-2xl bg-white border border-black">
        <div className="p-4 flex justify-between items-center border-b border-black bg-white">
          <h3 className="text-base font-medium text-black flex items-center gap-2">
            Take photo
          </h3>
          <button onClick={onClose} className="p-1 border border-transparent hover:border-black hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white text-red-600 font-medium p-4 text-center text-sm">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          )}
        </div>

        <div className="p-6 flex justify-center bg-white border-t border-black">
          <button
            onClick={handleCapture}
            disabled={!!error}
            className="w-16 h-16 rounded-full border border-black flex items-center justify-center hover:bg-gray-100 active:bg-black transition-colors"
          >
             <div className="w-10 h-10 bg-black rounded-full" />
          </button>
        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default WebcamCapture;
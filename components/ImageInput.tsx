import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Camera, Clipboard, ImageIcon, Plus } from 'lucide-react';
import WebcamCapture from './WebcamCapture';

interface ImageInputProps {
  label: string;
  description: string;
  value: string | null;
  onChange: (base64: string | null, mimeType: string) => void;
  allowWebcam?: boolean;
}

const ImageInput: React.FC<ImageInputProps> = ({ label, description, value, onChange, allowWebcam = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        onChange(e.target.result, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Attach paste listener to document to capture paste events when hovering or focused
  useEffect(() => {
    const handlePasteEvent = (e: ClipboardEvent) => {
        const div = containerRef.current;
        if (!div) return;

        const isFocused = document.activeElement === div || div.contains(document.activeElement);
        
        if (isFocused || isHovering.current) {
            if (e.clipboardData?.files?.[0]) {
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    e.preventDefault();
                    processFile(file);
                    return;
                }
            } 
            if (e.clipboardData?.items) {
                for (let i = 0; i < e.clipboardData.items.length; i++) {
                    if (e.clipboardData.items[i].type.startsWith('image/')) {
                        const file = e.clipboardData.items[i].getAsFile();
                        if (file) {
                             e.preventDefault();
                             processFile(file);
                             return; 
                        }
                    }
                }
            }
        }
    };

    document.addEventListener('paste', handlePasteEvent);
    return () => document.removeEventListener('paste', handlePasteEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleWebcamCapture = (base64: string) => {
    onChange(base64, 'image/jpeg'); // Webcam usually jpeg
    setShowWebcam(false);
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, '');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <label className="text-lg font-medium">{label}</label>}
      
      <div
        ref={containerRef}
        tabIndex={0}
        className={`
          relative group flex flex-col items-center justify-center w-full aspect-square md:aspect-[4/3] border transition-all duration-100 outline-none
          ${isDragging 
            ? 'border-black bg-black text-white' 
            : 'border-black bg-white hover:bg-gray-50 text-black'
          }
          ${value ? 'border-black' : ''}
          focus:ring-1 focus:ring-black
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => { isHovering.current = true; }}
        onMouseLeave={() => { isHovering.current = false; }}
        onClick={() => !value && inputRef.current?.click()}
      >
        {value ? (
          <div className="relative w-full h-full">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 z-10">
                <button onClick={clearImage} className="bg-white text-black p-1.5 hover:bg-red-500 hover:text-white transition-colors border border-black">
                    <X size={16} />
                </button>
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                <button 
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="px-4 py-2 bg-white text-black font-medium text-sm border border-black hover:bg-black hover:text-white hover:border-white transition-colors"
                >
                    Change image
                </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center w-full h-full">
             <div className="mb-4 p-3 border border-black rounded-full">
                <Plus size={20} strokeWidth={1.5} />
             </div>
            <div>
              <p className="text-base font-normal mb-1">{description}</p>
              <p className="text-xs font-normal text-gray-500">Click or drag</p>
            </div>
            
            <div className="flex gap-3 w-full justify-center mt-6">
                {allowWebcam && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowWebcam(true);
                        }}
                        className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white font-normal text-xs flex items-center gap-1.5"
                    >
                        <Camera size={12} /> Camera
                    </button>
                )}
                 <button
                    type="button"
                    onClick={(e) => {
                         e.stopPropagation();
                         containerRef.current?.focus();
                    }}
                    className="px-3 py-1.5 border border-black hover:bg-black hover:text-white font-normal text-xs flex items-center gap-1.5 transition-colors"
                    title="Hover and press Ctrl+V"
                >
                    <Clipboard size={12} /> Paste (Ctrl+V)
                </button>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {showWebcam && (
        <WebcamCapture
          onCapture={handleWebcamCapture}
          onClose={() => setShowWebcam(false)}
        />
      )}
    </div>
  );
};

export default ImageInput;
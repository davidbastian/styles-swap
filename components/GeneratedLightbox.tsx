import React from 'react';
import { X, Download } from 'lucide-react';

interface GeneratedLightboxProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const GeneratedLightbox: React.FC<GeneratedLightboxProps> = ({ imageUrl, isOpen, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `styleswap-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-200">
      <div className="flex justify-between items-center p-4 border-b border-black bg-white">
        <h2 className="text-black font-medium text-lg tracking-tight">Result</h2>
        <div className="flex gap-3">
             <button
                onClick={handleDownload}
                className="px-4 py-2 text-black border border-black hover:bg-black hover:text-white transition-colors font-normal text-xs flex items-center gap-2"
            >
                <Download size={16} /> <span className="hidden sm:inline">Download</span>
            </button>
            <button
                onClick={onClose}
                className="p-2 text-white bg-black border border-black hover:bg-white hover:text-black transition-colors"
                title="Close"
            >
                <X size={16} />
            </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 overflow-hidden">
        <img
          src={imageUrl}
          alt="Generated Art"
          className="max-w-full max-h-full object-contain border border-black"
        />
      </div>
    </div>
  );
};

export default GeneratedLightbox;
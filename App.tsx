import React, { useState, useEffect } from 'react';
import { Wand2, Loader2, Info, Ratio, Zap, Check, Coins } from 'lucide-react';
import ImageInput from './components/ImageInput';
import ApiKeyManager from './components/ApiKeyManager';
import GeneratedLightbox from './components/GeneratedLightbox';
import SubscriptionModal from './components/SubscriptionModal';
import { generateImage } from './services/gemini';
import { AspectRatio } from './types';

const App: React.FC = () => {
  const [styleImage, setStyleImage] = useState<{ base64: string; mime: string } | null>(null);
  const [subjectImage, setSubjectImage] = useState<{ base64: string; mime: string } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [keepClothes, setKeepClothes] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [apiKeyReady, setApiKeyReady] = useState(false);
  
  // Credit System State
  const [credits, setCredits] = useState<number>(0);
  const [showSubscription, setShowSubscription] = useState(false);

  // Initialize credits from local storage
  useEffect(() => {
    const savedCredits = localStorage.getItem('style_swap_credits');
    if (savedCredits === null) {
      // First time user gets 1 free credit
      setCredits(1);
      localStorage.setItem('style_swap_credits', '1');
    } else {
      setCredits(parseInt(savedCredits, 10));
    }
  }, []);

  const handleSubscribe = () => {
    // Top up credits (10 credits for 10€)
    const newCredits = credits + 10;
    setCredits(newCredits);
    localStorage.setItem('style_swap_credits', newCredits.toString());
    setShowSubscription(false);
  };

  const handleGenerate = async () => {
    if (!styleImage || !subjectImage) return;

    // Check credits
    if (credits <= 0) {
        setShowSubscription(true);
        return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await generateImage(
        styleImage.base64,
        styleImage.mime,
        subjectImage.base64,
        subjectImage.mime,
        aspectRatio,
        keepClothes
      );
      
      setGeneratedImage(result);
      setIsLightboxOpen(true);
      
      // Deduct credit only on success
      const newBalance = Math.max(0, credits - 1);
      setCredits(newBalance);
      localStorage.setItem('style_swap_credits', newBalance.toString());

    } catch (err: any) {
        const errorMessage = err?.message || '';
        if (errorMessage.includes("Requested entity was not found")) {
             setError("API Key Error: Invalid or expired key.");
        } else {
             setError(errorMessage);
        }
    } finally {
      setIsGenerating(false);
    }
  };

  const isReady = styleImage && subjectImage && apiKeyReady;

  const ratios: AspectRatio[] = ["1:1", "4:3", "3:4", "16:9", "9:16"];

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-gray-100 selection:text-black">
      <ApiKeyManager onKeyReady={setApiKeyReady} />
      
      <SubscriptionModal 
        isOpen={showSubscription} 
        onClose={() => setShowSubscription(false)} 
        onSubscribe={handleSubscribe} 
      />

      {/* Credit Counter */}
      <div className="fixed top-6 right-6 z-40 hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-black shadow-sm">
        <Coins size={16} className={credits > 0 ? "text-black" : "text-gray-400"} />
        <span className="font-medium text-sm">
            {credits > 0 ? `${credits} Credits` : 'No credits'}
        </span>
        {credits === 0 && (
            <button 
                onClick={() => setShowSubscription(true)}
                className="ml-2 text-xs font-bold underline decoration-2 underline-offset-2 hover:text-gray-600"
            >
                Get more
            </button>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-end mb-12">
                <div className="text-left pl-1">
                    <h2 className="text-4xl md:text-5xl font-normal mb-4 leading-none tracking-tight">Universal <br/> Style Swap</h2>
                    <p className="text-gray-600 text-lg max-w-xl font-light">
                        Any vibe. Any subject. <br/>
                        <span className="text-black font-medium">Remix reality.</span> No filters.
                    </p>
                </div>
                {/* Mobile credit counter */}
                <div className="md:hidden flex flex-col items-end">
                     <span className="text-sm font-medium flex items-center gap-1">
                        <Coins size={14} /> {credits}
                     </span>
                     {credits === 0 && (
                         <button onClick={() => setShowSubscription(true)} className="text-xs underline mt-1 font-bold">Buy</button>
                     )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black mb-12">
                <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-black bg-white">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="flex items-center justify-center w-5 h-5 bg-black text-white font-medium text-xs rounded-full">1</span>
                        <h3 className="font-medium text-lg tracking-wide">The vibe (Style)</h3>
                    </div>
                    <ImageInput
                        label=""
                        description="Drop the reference"
                        value={styleImage?.base64 || null}
                        onChange={(base64, mime) => setStyleImage(base64 ? { base64, mime } : null)}
                        allowWebcam={false}
                    />
                </div>

                <div className="p-6 md:p-8 bg-white">
                     <div className="flex items-center gap-3 mb-4">
                        <span className="flex items-center justify-center w-5 h-5 bg-black text-white font-medium text-xs rounded-full">2</span>
                        <h3 className="font-medium text-lg tracking-wide">The subject (Face)</h3>
                    </div>
                    <ImageInput
                        label=""
                        description="Drop the face"
                        value={subjectImage?.base64 || null}
                        onChange={(base64, mime) => setSubjectImage(base64 ? { base64, mime } : null)}
                        allowWebcam={true}
                    />
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                <div>
                    <label className="text-sm font-medium block mb-3 w-max text-gray-600">
                        Target ratio
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {ratios.map((ratio) => (
                            <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`
                                    px-4 py-2 text-sm font-normal border border-black transition-all duration-150
                                    ${aspectRatio === ratio
                                        ? 'bg-black text-white'
                                        : 'bg-white text-black hover:bg-gray-50'
                                    }
                                `}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium block mb-3 w-max text-gray-600">
                        Preferences
                    </label>
                    <div 
                        className="flex items-center gap-3 cursor-pointer group select-none" 
                        onClick={() => setKeepClothes(!keepClothes)}
                    >
                        <div className={`w-6 h-6 border border-black flex items-center justify-center transition-colors ${keepClothes ? 'bg-black text-white' : 'bg-white group-hover:bg-gray-50'}`}>
                            {keepClothes && <Check size={16} />}
                        </div>
                        <span className="text-sm font-medium text-black">Keep original clothes</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 border border-red-600 bg-red-50 text-red-600 font-medium text-left text-sm whitespace-pre-wrap">
                    <span className="font-bold">Error:</span> {error}
                </div>
            )}

            <div className="flex flex-col items-center">
                <button
                    onClick={handleGenerate}
                    disabled={!isReady || isGenerating}
                    className={`
                        w-full md:w-auto px-8 py-4 text-lg font-medium tracking-wide border border-black transition-all duration-150 relative overflow-hidden
                        ${isReady && !isGenerating 
                            ? 'bg-black text-white hover:bg-white hover:text-black cursor-pointer' 
                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}
                    `}
                >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                        {isGenerating ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5" />
                                Remixing Reality...
                            </>
                        ) : (
                            <>
                                {credits > 0 ? (
                                    <>Generate Image <span className="text-xs opacity-60 ml-1">({credits} left)</span></>
                                ) : (
                                    <>Recharge to Generate</>
                                )}
                            </>
                        )}
                    </span>
                </button>
                {!apiKeyReady && (
                    <p className="mt-4 text-xs font-normal text-gray-500">
                        Waiting for API key...
                    </p>
                )}
            </div>
        </div>
      </main>

      <GeneratedLightbox
        imageUrl={generatedImage}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
};

export default App;
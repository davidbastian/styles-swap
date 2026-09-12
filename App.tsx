import React, { useState, useEffect } from 'react';
import { Loader2, Check, Key as KeyIcon } from 'lucide-react';
import ImageInput from './components/ImageInput';
import KeyPanel from './components/KeyPanel';
import GeneratedLightbox from './components/GeneratedLightbox';
import { swap } from './services/swap';
import { loadKey, providerById, type Key } from './services/providers';
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

  // The key is the user's own, kept in this browser and nowhere else.
  const [apiKey, setApiKey] = useState<Key | null>(null);
  const [keyPanelOpen, setKeyPanelOpen] = useState(false);

  useEffect(() => {
    const saved = loadKey();
    setApiKey(saved);
    setKeyPanelOpen(!saved);
  }, []);

  const handleGenerate = async () => {
    if (!styleImage || !subjectImage) return;
    if (!apiKey) { setKeyPanelOpen(true); return; }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await swap(
        apiKey,
        styleImage.base64,
        styleImage.mime,
        subjectImage.base64,
        subjectImage.mime,
        aspectRatio,
        keepClothes
      );

      setGeneratedImage(result);
      setIsLightboxOpen(true);

    } catch (err: any) {
        const message = err?.message || '';
        // A bad key is the one failure worth naming, because it is the one the
        // person can fix without guessing.
        if (/API key|API_KEY|Unauthorized|401|403|not found/i.test(message)) {
             setError(`Key rejected by ${providerById(apiKey.provider).name}. Check it, or use another provider.`);
             setKeyPanelOpen(true);
        } else {
             setError(message);
        }
    } finally {
      setIsGenerating(false);
    }
  };

  const isReady = styleImage && subjectImage && apiKey;

  const ratios: AspectRatio[] = ["1:1", "4:3", "3:4", "16:9", "9:16"];

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-gray-100 selection:text-black">
      <KeyPanel
        value={apiKey}
        onChange={setApiKey}
        open={keyPanelOpen}
        onOpenChange={setKeyPanelOpen}
      />

      {/* Which key is paying, and a way to change it */}
      <button
        onClick={() => setKeyPanelOpen(true)}
        className="fixed top-6 right-6 z-40 hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-black text-sm hover:bg-gray-50 transition-colors"
      >
        <KeyIcon size={14} className={apiKey ? 'text-black' : 'text-gray-400'} />
        <span className="font-medium">
          {apiKey ? providerById(apiKey.provider).name : 'Add a key'}
        </span>
      </button>

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
                {/* The same, on a phone */}
                <button onClick={() => setKeyPanelOpen(true)} className="md:hidden flex items-center gap-1.5 text-sm font-medium">
                    <KeyIcon size={14} className={apiKey ? 'text-black' : 'text-gray-400'} />
                    {apiKey ? providerById(apiKey.provider).name : 'Add a key'}
                </button>
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
                        ) : apiKey ? (
                            <>Generate Image <span className="text-xs opacity-60 ml-1">on {providerById(apiKey.provider).name}</span></>
                        ) : (
                            <>Add a key to generate</>
                        )}
                    </span>
                </button>
                {!apiKey && (
                    <p className="mt-4 text-xs font-normal text-gray-500">
                        Google, fal.ai or OpenRouter — whichever you already pay for.
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
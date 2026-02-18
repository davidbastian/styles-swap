import React, { useEffect, useState } from 'react';
import { Key } from 'lucide-react';

interface ApiKeyManagerProps {
  onKeyReady: (ready: boolean) => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onKeyReady }) => {
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkKey = async () => {
    setChecking(true);
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      try {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
        onKeyReady(has);
      } catch (e) {
        console.error("Error checking API key:", e);
        setHasKey(false);
        onKeyReady(false);
      }
    } else {
        const envKey = process.env.API_KEY;
        if(envKey) {
            setHasKey(true);
            onKeyReady(true);
        } else {
            setHasKey(false);
            onKeyReady(false);
        }
    }
    setChecking(false);
  };

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        await checkKey(); 
      } catch (e) {
        console.error("Error opening key selector:", e);
        await checkKey();
      }
    } else {
        alert("API Key selection not available in this environment.");
    }
  };

  if (checking) return null;
  if (hasKey) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-black p-8 text-center">
        <div className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto mb-6 rounded-full">
          <Key size={24} />
        </div>
        <h2 className="text-xl font-medium text-black mb-4">Access required</h2>
        <p className="text-gray-600 mb-8 text-sm">
          Paid API key required for <strong className="text-black font-medium">Gemini Nano Banana Pro</strong>.
        </p>
        
        <button
          onClick={handleSelectKey}
          className="w-full py-3 px-6 bg-black text-white hover:bg-white hover:text-black border border-black font-medium transition-all text-sm"
        >
          Select API key
        </button>
        
        <p className="mt-6 text-xs text-gray-400">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="hover:text-black hover:underline">
            View billing info
          </a>
        </p>
      </div>
    </div>
  );
};

export default ApiKeyManager;
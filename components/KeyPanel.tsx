import React, { useState } from 'react';
import { Key as KeyIcon, Check, X } from 'lucide-react';
import { PROVIDERS, providerById, saveKey, type Key, type ProviderId } from '../services/providers';

/*
 * Bring your own key.
 *
 * What was here before was a credit counter: one free generation, then a modal
 * asking for ten euros that went nowhere. It was the shape of a business around
 * a tool that costs a fraction of a cent to run, and it meant the app only
 * worked on one person's bill.
 *
 * This is the honest version. Choose where you already have credit — Google,
 * fal.ai, OpenRouter — paste the key, and it stays in this browser. There is no
 * server in this app to send it to.
 */

interface Props {
  value: Key | null;
  onChange: (k: Key | null) => void;
  /** Open on load when there is no key; also openable from the header. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KeyPanel: React.FC<Props> = ({ value, onChange, open, onOpenChange }) => {
  const [provider, setProvider] = useState<ProviderId>(value?.provider || 'google');
  const [text, setText] = useState(value?.value || '');
  const [warn, setWarn] = useState<string | null>(null);

  const p = providerById(provider);

  const use = () => {
    const clean = text.trim();
    if (!clean) { setWarn('Paste a key first.'); return; }
    if (!p.looksLikeKey(clean)) {
      /* A guess, not a gate: the shape is usually wrong before the API is. */
      setWarn(`That does not look like a ${p.name} key (${p.placeholder}). Using it anyway.`);
    }
    const k = { provider, value: clean };
    saveKey(k);
    onChange(k);
    onOpenChange(false);
  };

  const forget = () => {
    saveKey(null);
    onChange(null);
    setText('');
    setWarn(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-black p-8">
        {value && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-6 right-6 p-1 hover:opacity-60"
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        )}

        <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-6">
          <KeyIcon size={20} />
        </div>

        <h2 className="text-xl font-medium mb-2">Your key, your bill</h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          Pick where you already have credit and paste a key. It stays in this browser —
          there is no server in this app to send it to.
        </p>

        <div className="flex border border-black mb-5">
          {PROVIDERS.map(op => (
            <button
              key={op.id}
              onClick={() => { setProvider(op.id); setWarn(null); }}
              className={`flex-1 py-2 text-sm border-r border-black last:border-r-0 transition-colors ${
                provider === op.id ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'
              }`}
            >
              {op.name}
            </button>
          ))}
        </div>

        <input
          type="password"
          value={text}
          onChange={e => { setText(e.target.value); setWarn(null); }}
          onKeyDown={e => { if (e.key === 'Enter') use(); }}
          placeholder={p.placeholder}
          className="w-full border border-black px-4 py-3 text-sm font-mono outline-none focus:border-blue-600"
          autoFocus
        />
        <p className="mt-2 text-xs text-gray-500">
          {p.model} ·{' '}
          <a href={p.keysUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-black">
            get a {p.name} key
          </a>
        </p>
        {warn && <p className="mt-3 text-xs text-amber-700">{warn}</p>}

        <button
          onClick={use}
          className="mt-6 w-full py-3 bg-black text-white hover:bg-white hover:text-black border border-black font-medium transition-all text-sm flex items-center justify-center gap-2"
        >
          <Check size={16} /> Use this key
        </button>

        {value && (
          <button onClick={forget} className="mt-3 w-full text-xs text-gray-500 underline hover:text-black">
            Forget the saved key
          </button>
        )}
      </div>
    </div>
  );
};

export default KeyPanel;

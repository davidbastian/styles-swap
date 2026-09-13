import React, { useState } from 'react';
import { Key as KeyIcon } from 'lucide-react';
import { providerById, qualityFor, type Key, type QualityId } from '../services/providers';

/*
 * The key, and what it is about to be charged.
 *
 * Quality belongs here rather than beside the ratio: the ratio is about the
 * picture and this is about the bill, and the bill is the key's business. It
 * also keeps the page in front of you down to the two photographs and one
 * button, which is the whole idea of the tool — a setting you change once every
 * few sessions should not sit at the same size as the thing you do every time.
 *
 * Hover opens it on a mouse; a tap opens it on a phone, where hover does not
 * exist. Either way the level and its price are already on the button, so the
 * menu is where you change your mind, not where you find out.
 */

const money = (n: number) => (n < 0.01 ? `${(n * 100).toFixed(1)}¢` : `$${n.toFixed(2)}`);

interface Props {
  value: Key | null;
  quality: QualityId;
  onQuality: (q: QualityId) => void;
  onChangeKey: () => void;
  /** 'bar' is the framed button in the corner, 'inline' the bare one on a phone. */
  variant?: 'bar' | 'inline';
}

const KeyMenu: React.FC<Props> = ({ value, quality, onQuality, onChangeKey, variant = 'bar' }) => {
  const [open, setOpen] = useState(false);

  /* No key, no menu: there is nothing to price and one thing to do. */
  if (!value) {
    return (
      <button
        onClick={onChangeKey}
        className={
          variant === 'bar'
            ? 'flex items-center gap-2 px-4 py-2 bg-white border border-black text-sm hover:bg-gray-50 transition-colors'
            : 'flex items-center gap-1.5 text-sm font-medium'
        }
      >
        <KeyIcon size={14} className="text-gray-400" />
        <span className="font-medium">Add a key</span>
      </button>
    );
  }

  const provider = providerById(value.provider);
  const level = qualityFor(value.provider, quality);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className={
          variant === 'bar'
            ? 'flex items-center gap-2 px-4 py-2 bg-white border border-black text-sm hover:bg-gray-50 transition-colors'
            : 'flex items-center gap-1.5 text-sm font-medium'
        }
      >
        <KeyIcon size={14} className="text-black" />
        <span className="font-medium">{provider.name}</span>
        <span className="text-gray-500 text-xs">
          {level.name} · {money(level.usd)}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full w-72 bg-white border border-black -mt-px z-50">
          <p className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-[0.12em] text-gray-500">
            Quality on {provider.name}
          </p>
          {provider.qualities.map(q => (
            <button
              key={q.id}
              onClick={() => { onQuality(q.id); setOpen(false); }}
              className={`block w-full text-left px-4 py-3 border-t border-black/10 transition-colors ${
                level.id === q.id ? 'bg-black text-white' : 'hover:bg-gray-50'
              }`}
            >
              <span className="flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium">{q.name}</span>
                <span className={level.id === q.id ? 'opacity-70' : 'text-gray-500'}>
                  {money(q.usd)} an image
                </span>
              </span>
              <span className={`block mt-1 text-xs ${level.id === q.id ? 'opacity-70' : 'text-gray-500'}`}>
                {q.note}
              </span>
            </button>
          ))}
          <button
            onClick={() => { setOpen(false); onChangeKey(); }}
            className="block w-full text-left px-4 py-3 border-t border-black text-sm hover:bg-gray-50"
          >
            Change key
          </button>
        </div>
      )}
    </div>
  );
};

export default KeyMenu;

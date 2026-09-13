/*
 * Two ways to reach the same job.
 *
 * Gemini and GPT Image, and deliberately no more. Adding a router or an
 * aggregator is half an hour's work — the swap is one request, so anything that
 * carries two images and an instruction can run it — but the point of this tool
 * is to generate without complications, and a menu of seven services is a
 * complication before the first picture. These two are the ones most people
 * already have a key for, and getting one takes a minute either way.
 *
 * Each provider is a small adapter over one function: given the images, the
 * instruction and the ratio, return a data URL. Everything above this file —
 * the fallback chain, the UI — is provider-agnostic, which is what makes a
 * third one easy if it is ever worth it.
 *
 * The key never leaves the browser. There is no server in this app; requests go
 * from the page to the provider, and the key sits in localStorage on the
 * machine that typed it.
 */

import { say } from './skill';

export type ProviderId = 'google' | 'openai';

export type QualityId = 'draft' | 'standard' | 'high';

/*
 * Quality is the price, so it is a choice and the price is on the label.
 *
 * Left to itself each provider picks its expensive end, which is the right
 * default for a picture you are keeping and the wrong one for the four you
 * throw away first. Draft exists for those four.
 *
 * `usd` is an approximation and says so in the UI: the real bill also counts
 * the two photographs you sent, and a refusal that falls through to the second
 * attempt costs two generations rather than one. It is the right order of
 * magnitude, which is the thing worth knowing before you press the button.
 */
export interface Quality {
  id: QualityId;
  name: string;
  /** One line, for the label under the buttons. */
  note: string;
  /** Roughly what one image costs, in dollars. */
  usd: number;
  /** Quality can mean a different model, not only a different setting. */
  model: string;
  /** Google: the pixel budget. OpenAI: the literal quality parameter. */
  param: string;
}

export interface Provider {
  id: ProviderId;
  name: string;
  /** What the model is called wherever the key is billed. */
  model: string;
  /** Where a key comes from, for the link under the field. */
  keysUrl: string;
  /** A hint so an obviously wrong key fails here rather than at the API. */
  looksLikeKey: (k: string) => boolean;
  placeholder: string;
  qualities: Quality[];
}

export const PROVIDERS: Provider[] = [
  {
    id: 'google',
    name: 'Google',
    model: 'gemini-3-pro-image-preview',
    keysUrl: 'https://aistudio.google.com/apikey',
    looksLikeKey: k => k.startsWith('AIza') && k.length > 30,
    placeholder: 'AIza…',
    qualities: [
      {
        id: 'draft',
        name: 'Draft',
        note: 'Gemini 2.5 Flash Image — fast, cheap, and usually enough',
        usd: 0.039,
        model: 'gemini-2.5-flash-image',
        param: '1K',
      },
      {
        id: 'standard',
        name: 'Best',
        note: 'Gemini 3 Pro Image — the one this recipe is written for',
        usd: 0.134,
        model: 'gemini-3-pro-image-preview',
        param: '1K',
      },
    ],
  },
  {
    id: 'openai',
    name: 'GPT Image',
    model: 'gpt-image-2',
    keysUrl: 'https://platform.openai.com/api-keys',
    looksLikeKey: k => k.startsWith('sk-') && k.length > 20,
    placeholder: 'sk-…',
    qualities: [
      { id: 'draft', name: 'Low', note: 'Enough for a good result — the one I would recommend', usd: 0.006, model: 'gpt-image-2', param: 'low' },
      { id: 'standard', name: 'Medium', note: 'Enough for anything going on a profile', usd: 0.053, model: 'gpt-image-2', param: 'medium' },
      { id: 'high', name: 'High', note: 'Everything the model has, at eight times the price', usd: 0.211, model: 'gpt-image-2', param: 'high' },
    ],
  },
];

export const providerById = (id: ProviderId) =>
  PROVIDERS.find(p => p.id === id) || PROVIDERS[0];

/** The chosen quality, or that provider's middle one if it has no such level. */
export function qualityFor(provider: ProviderId, id: QualityId): Quality {
  const list = providerById(provider).qualities;
  return list.find(q => q.id === id) || list.find(q => q.id === 'standard') || list[0];
}

export interface Key {
  provider: ProviderId;
  value: string;
}

const STORE = 'style_swap_key';

export function loadKey(): Key | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    const k = JSON.parse(raw) as Key;
    return k?.value ? k : null;
  } catch {
    return null;
  }
}

export function saveKey(k: Key | null) {
  try {
    if (k) localStorage.setItem(STORE, JSON.stringify(k));
    else localStorage.removeItem(STORE);
  } catch {
    /* a browser with storage switched off can still generate, just not remember */
  }
}

/* ── The request each provider wants ──────────────────────────────────────── */

export interface Shot {
  /** Raw base64, no data URL prefix. */
  data: string;
  mime: string;
}

export interface Ask {
  key: Key;
  /** The images to send, in order. One or two: the fallback sends only the subject. */
  images: Shot[];
  prompt: string;
  aspectRatio: string;
  /** Which level to pay for. Defaults to the middle one. */
  quality?: QualityId;
}

const dataUrl = (mime: string, data: string) => `data:${mime || 'image/png'};base64,${data}`;

/* Google, through the REST endpoint rather than the SDK, so all three
   providers are one shape and the bundle carries one less dependency. */
async function google({ key, images, prompt, aspectRatio, quality }: Ask): Promise<string> {
  /* On Google the level is a different model, so it is chosen here rather than
     passed as a parameter the endpoint has never heard of. */
  const q = qualityFor('google', quality || 'standard');
  const model = q.model;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.value },
      body: JSON.stringify({
        contents: [{
          parts: [
            ...images.map(i => ({ inlineData: { mimeType: i.mime, data: i.data } })),
            { text: prompt },
          ],
        }],
        generationConfig: { imageConfig: { aspectRatio, imageSize: q.param } },
      }),
    });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Google ${res.status}`);
  const parts = json?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    if (p.inlineData?.data) return dataUrl(p.inlineData.mimeType, p.inlineData.data);
  }
  const text = parts.map((p: any) => p.text).filter(Boolean).join(' ').trim();
  throw new Error(text ? `Model message: ${text}` : 'No image generated in the response.');
}

/*
 * GPT Image edits an image rather than generating from two references, so the
 * two are sent as an array on the same request and the instruction says which
 * is which. It is multipart, not JSON, and the picture comes back base64.
 *
 * Its sizes are fixed, so the five ratios land on the nearest of the three it
 * accepts; the crop the app asked for is honoured by the frame, not by the
 * model inventing a shape it does not have.
 */
const OPENAI_SIZE: Record<string, string> = {
  '1:1': '1024x1024',
  '4:3': '1536x1024',
  '16:9': '1536x1024',
  '3:4': '1024x1536',
  '9:16': '1024x1536',
};

const asFile = async (s: Shot, name: string) => {
  const res = await fetch(dataUrl(s.mime, s.data));
  return new File([await res.blob()], name, { type: s.mime || 'image/png' });
};

async function openai({ key, images, prompt, aspectRatio, quality }: Ask): Promise<string> {
  /* Left unset this defaults to auto, which is the expensive end — the one
     setting on this request that can multiply the bill by thirty. */
  const q = qualityFor('openai', quality || 'standard');
  const form = new FormData();
  form.append('model', q.model);
  form.append('prompt', prompt);
  form.append('size', OPENAI_SIZE[aspectRatio] || 'auto');
  form.append('quality', q.param);
  form.append('n', '1');
  for (const [i, img] of images.entries()) {
    form.append('image[]', await asFile(img, `image-${i}.png`));
  }
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key.value}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI ${res.status}`);
  const b64 = json?.data?.[0]?.b64_json;
  if (b64) return `data:image/png;base64,${b64}`;
  throw new Error('No image generated in the response.');
}

const ROUTES: Record<ProviderId, (a: Ask) => Promise<string>> = { google, openai };

export const ask = (a: Ask) => ROUTES[a.key.provider](a);

/*
 * A description of the reference, in words, for the last resort. Both providers
 * have a cheap model that can look at a picture, so both get a real one.
 */
export async function describe(key: Key, image: Shot): Promise<string> {
  const generic = 'A high quality professional photograph with cinematic lighting.';
  const prompt = say('When refused: describe');
  try {
    if (key.provider === 'google') {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.value },
          body: JSON.stringify({
            contents: [{ parts: [{ inlineData: { mimeType: image.mime, data: image.data } }, { text: prompt }] }],
          }),
        });
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(' ');
      return text?.trim() || generic;
    }
    if (key.provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.value}` },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl(image.mime, image.data) } },
            ],
          }],
        }),
      });
      const json = await res.json();
      return json?.choices?.[0]?.message?.content?.trim() || generic;
    }
  } catch {
    /* the description is a fallback's fallback; a generic one still generates */
  }
  return generic;
}

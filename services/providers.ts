/*
 * Three ways to reach the same model.
 *
 * The app used to assume Google AI Studio: the key came from the host page and
 * the only route was @google/genai. That ties the tool to one account and one
 * bill. The swap itself is a single request — two images and an instruction in,
 * one image out — so it can go through anything that can carry that, and the
 * person using it can bring whichever key they already have.
 *
 * Each provider here is a small adapter over one function: given the two
 * images, the instruction and the ratio, return a data URL. Everything above
 * this file — the fallback chain, the UI — is provider-agnostic.
 *
 * The key never leaves the browser. There is no server in this app; requests go
 * from the page to the provider, and the key sits in localStorage on the
 * machine that typed it.
 */

export type ProviderId = 'google' | 'fal' | 'openrouter';

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
}

export const PROVIDERS: Provider[] = [
  {
    id: 'google',
    name: 'Google',
    model: 'gemini-3-pro-image-preview',
    keysUrl: 'https://aistudio.google.com/apikey',
    looksLikeKey: k => k.startsWith('AIza') && k.length > 30,
    placeholder: 'AIza…',
  },
  {
    id: 'fal',
    name: 'fal.ai',
    model: 'fal-ai/nano-banana-pro/edit',
    keysUrl: 'https://fal.ai/dashboard/keys',
    looksLikeKey: k => k.includes(':') && k.length > 20,
    placeholder: 'key-id:key-secret',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    model: 'google/gemini-3-pro-image-preview',
    keysUrl: 'https://openrouter.ai/keys',
    looksLikeKey: k => k.startsWith('sk-or-') && k.length > 20,
    placeholder: 'sk-or-…',
  },
];

export const providerById = (id: ProviderId) =>
  PROVIDERS.find(p => p.id === id) || PROVIDERS[0];

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
}

const dataUrl = (mime: string, data: string) => `data:${mime || 'image/png'};base64,${data}`;

/* Google, through the REST endpoint rather than the SDK, so all three
   providers are one shape and the bundle carries one less dependency. */
async function google({ key, images, prompt, aspectRatio }: Ask): Promise<string> {
  const model = providerById('google').model;
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
        generationConfig: { imageConfig: { aspectRatio, imageSize: '1K' } },
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

/* fal.ai runs the same family of models behind its own queue. Its edit
   endpoints take image URLs, and a data URL counts as one, so nothing has to
   be uploaded first. */
async function fal({ key, images, prompt, aspectRatio }: Ask): Promise<string> {
  const res = await fetch(`https://fal.run/${providerById('fal').model}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${key.value}` },
    body: JSON.stringify({
      prompt,
      image_urls: images.map(i => dataUrl(i.mime, i.data)),
      aspect_ratio: aspectRatio,
      num_images: 1,
      output_format: 'png',
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.error || `fal.ai ${res.status}`);
  const url = json?.images?.[0]?.url;
  if (!url) throw new Error('No image generated in the response.');
  return url;
}

/* OpenRouter speaks the chat shape, with the images as message parts and the
   picture coming back in the message's own images array. */
async function openrouter({ key, images, prompt }: Ask): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.value}` },
    body: JSON.stringify({
      model: providerById('openrouter').model,
      modalities: ['image', 'text'],
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...images.map(i => ({ type: 'image_url', image_url: { url: dataUrl(i.mime, i.data) } })),
        ],
      }],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `OpenRouter ${res.status}`);
  const msg = json?.choices?.[0]?.message;
  const url = msg?.images?.[0]?.image_url?.url;
  if (url) return url;
  throw new Error(msg?.content ? `Model message: ${msg.content}` : 'No image generated in the response.');
}

const ROUTES: Record<ProviderId, (a: Ask) => Promise<string>> = { google, fal, openrouter };

export const ask = (a: Ask) => ROUTES[a.key.provider](a);

/*
 * A description of the reference, in words, for the last resort.
 *
 * Only Google and OpenRouter have a cheap text model to hand here; fal's
 * catalogue is image and video, so it falls back to a generic line rather than
 * pretending to have looked.
 */
export async function describe(key: Key, image: Shot): Promise<string> {
  const generic = 'A high quality professional photograph with cinematic lighting.';
  const prompt = 'Analyze this image in detail. Describe the clothing, outfit, costume, lighting, background, camera angle, photography style, and mood. Do not mention any specific celebrity names. Focus on the visual aesthetics and physical details of the scene and the subject’s attire.';
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
    if (key.provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.value}` },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
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

import { USER_PROMPT_TEMPLATE } from '../constants';
import { AspectRatio } from '../types';
import { ask, describe, Key, Shot } from './providers';

/*
 * The swap, and what to do when it is refused.
 *
 * A style swap that always works is not a prompt, it is a fallback chain. Send
 * a model two photographs of people and it will sometimes decline, and the
 * reason is rarely something a user can act on. So a refusal is not an error
 * here, it is the next step: each attempt gives the model less of the original
 * photograph to object to, and only the third gives up.
 *
 *   1. both images, straight in
 *   2. the reference redrawn without its face, then the swap again
 *   3. the reference in words, and no reference photograph sent at all
 *
 * The face is what is protected in all three. Everything else is replaceable.
 */

const strip = (dataUrl: string) => dataUrl.split(',')[1];

/* A refusal reads as "no image came back". A network or key failure does not,
   and there is nothing to retry there — those go straight up. */
const isRefusal = (e: any) => {
  const m = String(e?.message || '');
  return m.includes('No image generated') || m.includes('Model message') ||
         m.includes('blocked') || m.includes('safety') || m.includes('SAFETY');
};

export async function swap(
  key: Key,
  styleUrl: string, styleMime: string,
  subjectUrl: string, subjectMime: string,
  aspectRatio: AspectRatio = '1:1',
  keepClothes = false,
): Promise<string> {
  const style: Shot = { data: strip(styleUrl), mime: styleMime };
  const subject: Shot = { data: strip(subjectUrl), mime: subjectMime };

  const clothing = keepClothes
    ? 'STRICTLY PRESERVE the clothing and outfit worn by the subject in Reference Image 2 (Subject Source). Keep the original clothes while adapting lighting and environment.'
    : 'Replace the subject’s clothing with the clothing style, costume design, or outfit found in Reference Image 1 (Style Source).';

  const recipe = (note = '') => `
Reference Image 1 (Style Source): [First Image Attached]
Reference Image 2 (Subject Source): [Second Image Attached]

Instructions: ${USER_PROMPT_TEMPLATE}

CRITICAL CLOTHING INSTRUCTION: ${clothing}${note}`;

  // 1 — both images, straight in
  try {
    return await ask({ key, images: [style, subject], prompt: recipe(), aspectRatio });
  } catch (e) {
    if (!isRefusal(e)) throw e;
  }

  // 2 — the reference, made anonymous
  try {
    const facelessUrl = await ask({
      key,
      images: [style],
      prompt: 'Generate a copy of this image but remove the person’s face (blur it or make it headless) to obscure their identity. Keep the clothing, outfit, lighting, background, and composition EXACTLY the same. The goal is to see the clothes without the person’s identity.',
      aspectRatio: '1:1',
    });
    const faceless: Shot = { data: strip(facelessUrl), mime: 'image/png' };
    return await ask({
      key,
      images: [faceless, subject],
      prompt: recipe('\nNote: the style source image has been processed to obscure the original identity. Use the outfit and lighting visible in it.'),
      aspectRatio,
    });
  } catch (e) {
    if (!isRefusal(e)) throw e;
  }

  // 3 — the reference, in words
  const described = await describe(key, style);
  const clothingInWords = keepClothes
    ? 'Keep the subject’s original clothing from the reference image.'
    : `Replace the subject’s clothing to match this description: ${described}`;
  try {
    return await ask({
      key,
      images: [subject],
      prompt: `
Reference Image: [Subject Image Attached]

Target Style & Context Description: ${described}

Task: Generate a photorealistic image of the person in the Reference Image, adapted to the style and context described above.

Instructions:
- STRICTLY PRESERVE the facial identity and likeness of the person in the Reference Image.
- Apply the lighting, mood, camera angle, and background described in the Target Style.
- ${clothingInWords}
- Ensure high quality, realistic textures, and coherent lighting.`,
      aspectRatio,
    });
  } catch {
    throw new Error('Unable to generate image. The style reference may be too restricted by safety filters. Try a different style image.');
  }
}

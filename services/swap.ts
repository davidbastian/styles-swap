import { AspectRatio } from '../types';
import { ask, describe, Key, QualityId, Shot } from './providers';
import { recipe, say } from './skill';

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
  quality: QualityId = 'standard',
): Promise<string> {
  const style: Shot = { data: strip(styleUrl), mime: styleMime };
  const subject: Shot = { data: strip(subjectUrl), mime: subjectMime };

  // 1 — both images, straight in
  try {
    return await ask({ key, images: [style, subject], prompt: recipe(keepClothes), aspectRatio, quality });
  } catch (e) {
    if (!isRefusal(e)) throw e;
  }

  // 2 — the reference, made anonymous
  try {
    /* The faceless copy is scaffolding: nobody sees it, it only has to carry an
       outfit and a light, so it is generated at draft whatever the picture at
       the end of this is being paid for. */
    const facelessUrl = await ask({
      key,
      images: [style],
      prompt: say('When refused: anonymise'),
      aspectRatio: '1:1',
      quality: 'draft',
    });
    const faceless: Shot = { data: strip(facelessUrl), mime: 'image/png' };
    return await ask({
      key,
      images: [faceless, subject],
      prompt: recipe(keepClothes, '\nNote: the style source image has been processed to obscure the original identity. Use the outfit and lighting visible in it.'),
      aspectRatio,
      quality,
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

Task: ${say('When refused: from words')}

- ${clothingInWords}`,
      aspectRatio,
      quality,
    });
  } catch {
    throw new Error('Unable to generate image. The style reference may be too restricted by safety filters. Try a different style image.');
  }
}

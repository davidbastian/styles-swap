import raw from '../skills/style-swap/SKILL.md?raw';

/*
 * The instruction, as a file rather than a constant.
 *
 * What the model is told is the product here — every good result comes from
 * that paragraph being specific about what must survive and permissive about
 * everything else — and it was buried in constants.ts as a template literal,
 * where changing a line meant editing TypeScript and shipping a build.
 *
 * So it lives in skills/style-swap/SKILL.md: frontmatter that says what the
 * skill takes and returns, then one section per thing the app might need to
 * say. Vite inlines it with ?raw, so there is still no server and nothing to
 * fetch at runtime — but the file is prose, it diffs like prose, and anyone can
 * fork the app and rewrite the recipe without reading a line of code.
 *
 * The same shape agent skills use: a folder, a SKILL.md, a description that
 * says when to reach for it. Nothing here loads it dynamically yet; that is the
 * door this leaves open.
 */

export interface Skill {
  name: string;
  description: string;
  /** Every "## Heading" in the file, by its heading, lowercased. */
  sections: Record<string, string>;
}

function parse(md: string): Skill {
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
  const head = fm ? fm[1] : '';
  const body = fm ? md.slice(fm[0].length) : md;

  const field = (k: string) => {
    const m = head.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : '';
  };

  const sections: Record<string, string> = {};
  const parts = body.split(/^## +/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const title = part.slice(0, nl).trim().toLowerCase();
    sections[title] = part.slice(nl + 1).trim();
  }

  return { name: field('name'), description: field('description'), sections };
}

export const SKILL = parse(raw);

/** One section, or an empty string — a missing heading must not throw mid-swap. */
export const say = (heading: string) => SKILL.sections[heading.toLowerCase()] || '';

/** The main instruction, with the clothing rule the switch asks for. */
export function recipe(keepClothes: boolean, note = '') {
  return `
Reference Image 1 (Style Source): [First Image Attached]
Reference Image 2 (Subject Source): [Second Image Attached]

Instructions: ${say('Instruction')}

CRITICAL CLOTHING INSTRUCTION: ${say(keepClothes ? 'Clothing: keep' : 'Clothing: swap')}${note}`;
}

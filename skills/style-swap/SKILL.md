---
name: style-swap
description: Recreate the visual style of a reference photograph with a different person in it, preserving that person's face.
inputs:
  - style: the reference — its light, setting, framing, lens and outfit
  - subject: the face that has to survive
outputs:
  - one photorealistic image
---

## Instruction

Recreate the visual style, lighting, camera angle, composition, and mood of the
FIRST reference image provided, while replacing the subject with the person from
the SECOND reference image provided.

The final image must preserve the facial identity, proportions, and recognizable
features of the second image's subject, including face shape, eyes, nose, lips,
and overall likeness.

Match the first image's pose, framing, depth of field, environment, color
grading, and cinematic lighting, adapting them naturally to the second subject.

Maintain photorealism, realistic skin texture, natural lighting interaction, and
accurate facial structure.

No stylization unless present in the first image. No face distortion. No
beautification filters.

High detail, professional photography quality, coherent anatomy, realistic
shadows and highlights.

## Clothing: swap

Replace the subject's clothing with the clothing style, costume design, or
outfit found in Reference Image 1 (Style Source).

## Clothing: keep

STRICTLY PRESERVE the clothing and outfit worn by the subject in Reference Image
2 (Subject Source). Keep the original clothes while adapting lighting and
environment.

## When refused: anonymise

Generate a copy of this image but remove the person's face (blur it or make it
headless) to obscure their identity. Keep the clothing, outfit, lighting,
background, and composition EXACTLY the same. The goal is to see the clothes
without the person's identity.

## When refused: describe

Analyze this image in detail. Describe the clothing, outfit, costume, lighting,
background, camera angle, photography style, and mood. Do not mention any
specific celebrity names. Focus on the visual aesthetics and physical details of
the scene and the subject's attire.

## When refused: from words

Generate a photorealistic image of the person in the Reference Image, adapted to
the style and context described above.

- STRICTLY PRESERVE the facial identity and likeness of the person in the
  Reference Image.
- Apply the lighting, mood, camera angle, and background described in the Target
  Style.
- Ensure high quality, realistic textures, and coherent lighting.

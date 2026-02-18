export const SYSTEM_PROMPT = `
You are an expert professional photographer and digital artist. 
Your task is to generate a new image based on two input images and a set of instructions.
`;

export const USER_PROMPT_TEMPLATE = `
Recreate the visual style, lighting, camera angle, composition, and mood of the FIRST reference image provided, while replacing the subject with the person from the SECOND reference image provided.

The final image must preserve the facial identity, proportions, and recognizable features of the second image’s subject, including face shape, eyes, nose, lips, and overall likeness.

Match the first image’s pose, framing, depth of field, environment, color grading, and cinematic lighting, adapting them naturally to the second subject.

Maintain photorealism, realistic skin texture, natural lighting interaction, and accurate facial structure.

No stylization unless present in the first image. No face distortion. No beautification filters.

High detail, professional photography quality, coherent anatomy, realistic shadows and highlights.
`;

import { GoogleGenAI } from "@google/genai";
import { USER_PROMPT_TEMPLATE } from "../constants";
import { AspectRatio } from "../types";

// Helper to strip data URL prefix to get raw base64
const getBase64Data = (dataUrl: string) => {
  return dataUrl.split(',')[1];
};

// Helper to extract image from response
const extractImageFromResponse = (response: any) => {
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      const parts = candidate.content.parts;
      
      let textResponse = "";

      for (const part of parts) {
        // Check for inline data (image)
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
        // Accumulate text response if any
        if (part.text) {
          textResponse += part.text + " ";
        }
      }
      
      if (textResponse.trim()) {
        // Sometimes the model returns text explaining why it can't generate
        throw new Error("Model message: " + textResponse.trim());
      }
      
      if (candidate.finishReason) {
         throw new Error(`Generation stopped with reason: ${candidate.finishReason}`);
      }
    }
    
    throw new Error("No image generated in the response. The request may have been blocked or the model returned empty content.");
};

// Step 2 Helper: Create a sanitized version of the style image (remove face)
const createSanitizedStyleImage = async (ai: GoogleGenAI, imageBase64: string, mimeType: string): Promise<string> => {
  try {
    console.log("Attempting to sanitize style image...");
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: getBase64Data(imageBase64),
            },
          },
          {
            text: "Generate a copy of this image but remove the person's face (blur it or make it headless) to obscure their identity. Keep the clothing, outfit, lighting, background, and composition EXACTLY the same. The goal is to see the clothes without the person's identity."
          }
        ]
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1", // Keep square for reference utility
            imageSize: "1K"
        }
      }
    });
    return extractImageFromResponse(response);
  } catch (e) {
    console.warn("Sanitization step failed:", e);
    throw e;
  }
};

// Step 3 Helper: Analyze style image to text
const analyzeStyleImage = async (ai: GoogleGenAI, imageBase64: string, mimeType: string): Promise<string> => {
  try {
    console.log("Attempting to analyze style image text...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: getBase64Data(imageBase64),
            },
          },
          {
            text: "Analyze this image in detail. Describe the clothing, outfit, costume, lighting, background, camera angle, photography style, and mood. Do not mention any specific celebrity names. Focus on the visual aesthetics and physical details of the scene and subject's attire."
          }
        ]
      }
    });
    return response.text || "A cinematic photo with dramatic lighting and a distinct style.";
  } catch (e) {
    console.warn("Fallback analysis failed:", e);
    return "A high quality professional photograph with cinematic lighting.";
  }
}

export const generateImage = async (
  styleImageBase64: string,
  styleMimeType: string,
  subjectImageBase64: string,
  subjectMimeType: string,
  aspectRatio: AspectRatio = "1:1",
  keepClothes: boolean = false
): Promise<string> => {
  
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please select a key.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const subjectPart = {
    inlineData: {
      mimeType: subjectMimeType,
      data: getBase64Data(subjectImageBase64),
    },
  };

  // Determine clothing instruction based on user preference
  const clothingInstruction = keepClothes
    ? "STRICTLY PRESERVE the clothing and outfit worn by the subject in Reference Image 2 (Subject Source). Keep the original clothes while adapting lighting and environment."
    : "Replace the subject's clothing with the clothing style, costume design, or outfit found in Reference Image 1 (Style Source).";

  // --- ATTEMPT 1: Standard (Direct Image-to-Image) ---
  try {
    console.log("Starting Attempt 1: Direct Generation");
    
    const stylePart = {
        inlineData: {
          mimeType: styleMimeType,
          data: getBase64Data(styleImageBase64),
        },
    };

    const primaryPromptPart = {
        text: `
          Reference Image 1 (Style Source): [First Image Attached]
          Reference Image 2 (Subject Source): [Second Image Attached]
          
          Instructions: ${USER_PROMPT_TEMPLATE}
    
          CRITICAL CLOTHING INSTRUCTION: ${clothingInstruction}
        `
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [stylePart, subjectPart, primaryPromptPart],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K", 
        },
      },
    });

    return extractImageFromResponse(response);

  } catch (error: any) {
    const isBlockError = error.message.includes("No image generated") || 
                         error.message.includes("blocked") ||
                         error.message.includes("safety");

    if (!isBlockError) throw error; // If it's a network error, fail immediately.

    console.log("Attempt 1 blocked. Proceeding to Attempt 2...");

    // --- ATTEMPT 2: Intermediate (Sanitize Style Image -> Generate) ---
    try {
        console.log("Starting Attempt 2: Sanitized Reference");
        
        // Step 2a: Create a safe version of the style image
        const sanitizedStyleUrl = await createSanitizedStyleImage(ai, styleImageBase64, styleMimeType);
        
        const sanitizedStylePart = {
            inlineData: {
                mimeType: "image/png", // Output of generateContent is usually png
                data: getBase64Data(sanitizedStyleUrl),
            }
        };

        const sanitizedPromptPart = {
            text: `
              Reference Image 1 (Style Source - Sanitized): [First Image Attached]
              Reference Image 2 (Subject Source): [Second Image Attached]
              
              Instructions: ${USER_PROMPT_TEMPLATE}
        
              CRITICAL CLOTHING INSTRUCTION: ${clothingInstruction}
              Note: The style source image has been processed to obscure the original identity. Use the outfit and lighting visible in it.
            `
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [sanitizedStylePart, subjectPart, sanitizedPromptPart],
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: "1K", 
                },
            },
        });

        return extractImageFromResponse(response);

    } catch (errorAttempt2: any) {
        console.log("Attempt 2 failed/blocked. Proceeding to Attempt 3...", errorAttempt2);

        // --- ATTEMPT 3: Fallback (Text Description -> Generate) ---
        console.log("Starting Attempt 3: Text Description Fallback");

        const styleDescription = await analyzeStyleImage(ai, styleImageBase64, styleMimeType);
      
        const fallbackClothingInstruction = keepClothes 
            ? "Keep the subject's original clothing from the reference image."
            : "Replace the subject's clothing to match this description: " + styleDescription;

        const fallbackPrompt = {
            text: `
            Reference Image: [Subject Image Attached]
            
            Target Style & Context Description: ${styleDescription}
            
            Task: Generate a photorealistic image of the person in the Reference Image, adapted to the style and context described above.
            
            Instructions:
            - STRICTLY PRESERVE the facial identity and likeness of the person in the Reference Image.
            - Apply the lighting, mood, camera angle, and background described in the Target Style.
            - ${fallbackClothingInstruction}
            - Ensure high quality, realistic textures, and coherent lighting.
            `
        };

        try {
            const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: {
                    parts: [subjectPart, fallbackPrompt] // Only Subject Image + Text Prompt
                },
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio,
                        imageSize: "1K", 
                    },
                },
            });
            
            return extractImageFromResponse(fallbackResponse);

        } catch (fallbackError: any) {
            console.error("All attempts failed.");
            throw new Error("Unable to generate image. The style reference may be too restricted by safety filters. Try a different style image.");
        }
    }
  }
};
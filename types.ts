export type AspectRatio = "1:1" | "3:4" | "4:3" | "16:9" | "9:16";

export interface ImageState {
  file: File | null;
  previewUrl: string | null;
  base64: string | null;
  mimeType: string;
}

export interface GenerationConfig {
  aspectRatio: AspectRatio;
}

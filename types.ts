export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingChunks?: GroundingChunk[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface AppState {
  originalImage: string | null; // Base64
  currentImage: string | null; // Base64
  isProcessing: boolean;
  chatHistory: ChatMessage[];
  activeTab: 'design' | 'chat';
}

export type StyleOption = 'Modern' | 'Scandinavian' | 'Industrial' | 'Bohemian' | 'Minimalist' | 'Art Deco';

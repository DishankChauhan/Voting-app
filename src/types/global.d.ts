// Global type definitions

declare global {
  interface Window {
    ethereum: any; // Using any since MetaMask's provider type is complex
  }
}

export {}; 
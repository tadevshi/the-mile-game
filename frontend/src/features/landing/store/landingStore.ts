import { create } from 'zustand';

interface LandingState {
  // Hero animation state
  heroAnimationComplete: boolean;
  setHeroAnimationComplete: (complete: boolean) => void;
  
  // CTA tracking
  ctaClicked: {
    create: boolean;
    join: boolean;
    login: boolean;
  };
  trackCTA: (cta: 'create' | 'join' | 'login') => void;
  
  // Event code form state
  eventCode: string;
  setEventCode: (code: string) => void;
  
  // Code validation state
  isValidatingCode: boolean;
  codeError: string | null;
  setCodeValidation: (loading: boolean, error: string | null) => void;
}

export const useLandingStore = create<LandingState>((set) => ({
  heroAnimationComplete: false,
  setHeroAnimationComplete: (complete) => set({ heroAnimationComplete: complete }),
  
  ctaClicked: {
    create: false,
    join: false,
    login: false,
  },
  trackCTA: (cta) => set((state) => ({
    ctaClicked: { ...state.ctaClicked, [cta]: true }
  })),
  
  eventCode: '',
  setEventCode: (code) => set({ eventCode: code }),
  
  isValidatingCode: false,
  codeError: null,
  setCodeValidation: (loading, error) => set({ 
    isValidatingCode: loading, 
    codeError: error 
  }),
}));

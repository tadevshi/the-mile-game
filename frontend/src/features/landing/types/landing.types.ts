// Landing page types
export interface LandingFeature {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

export interface CTAEvent {
  action: 'create' | 'join' | 'login';
  timestamp: number;
}

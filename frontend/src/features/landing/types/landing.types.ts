// Landing page types
export interface LandingFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CTAEvent {
  action: 'create' | 'join' | 'login';
  timestamp: number;
}

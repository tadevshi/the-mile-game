import { Canvas } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import { Coin3D } from './Coin3D';
import { Suspense } from 'react';

interface MedalCanvasProps {
  type: 'gold' | 'silver' | 'bronze';
  avatar: string;
  className?: string;
}

export function MedalCanvas({ type, avatar, className = "w-full h-full" }: MedalCanvasProps) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3.5], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Suspense fallback={null}>
          <Environment preset="city" />
        </Suspense>

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
          <Coin3D type={type} avatar={avatar} />
        </Float>
      </Canvas>
    </div>
  );
}

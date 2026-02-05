import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useCursor, Sparkles, Float } from '@react-three/drei';
import type { Group } from 'three';

interface Coin3DProps {
  type: 'gold' | 'silver' | 'bronze';
  avatar: string;
  position?: [number, number, number];
  scale?: number;
}

const COLORS = {
  gold: '#FCD34D',   // Oro vibrante
  silver: '#FFFFFF', // Plata pura
  bronze: '#FDA4AF', // Rose Gold
};

const GEM_COLORS = {
  gold: '#BE185D',   // Pink 700
  silver: '#2563EB', // Blue 600
  bronze: '#B45309', // Amber 700
};

export function Coin3D({ type, avatar, position = [0, 0, 0], scale = 1 }: Coin3DProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHover] = useState(false);
  
  useFrame((_state, delta) => {
    if (groupRef.current) {
      // Rotación suave constante
      groupRef.current.rotation.y += delta * 0.8;
      
      if (hovered) {
        groupRef.current.rotation.y += delta * 2;
        groupRef.current.scale.setScalar(scale * 1.1);
      } else {
        groupRef.current.scale.setScalar(scale);
      }
    }
  });

  useCursor(hovered);

  const mainColor = COLORS[type];
  const gemColor = GEM_COLORS[type];
  const number = type === 'gold' ? '1' : type === 'silver' ? '2' : '3';

  return (
    <group position={position}>
      {/* Sparkles mágicos sutiles */}
      <Sparkles 
        count={12} 
        scale={1.5} 
        size={2} 
        speed={0.4} 
        opacity={0.4}
        color={mainColor}
      />

      <group 
        ref={groupRef}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        {/* CUERPO DEL MEDALLÓN (Cilindro grueso) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1, 1, 0.25, 64]} />
          <meshPhysicalMaterial 
            color={mainColor}
            metalness={0.7}
            roughness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>

        {/* CARA FRONTAL (Rosa pink-200 de la paleta) */}
        <mesh position={[0, 0, 0.126]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.85, 64]} />
          <meshStandardMaterial color="#FBCFE8" />
        </mesh>

        {/* AVATAR (Emoji) en el frente */}
        <Text
          position={[0, 0, 0.14]}
          fontSize={1.1}
          anchorX="center"
          anchorY="middle"
        >
          {avatar}
        </Text>

        {/* CARA TRASERA (Rosa pink-200 de la paleta) */}
        <mesh position={[0, 0, -0.126]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.85, 64]} />
          <meshStandardMaterial color="#FBCFE8" />
        </mesh>

        {/* NÚMERO en el dorso */}
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
          <Text
            position={[0, 0, -0.14]}
            rotation={[0, Math.PI, 0]}
            fontSize={0.9}
            color={gemColor}
            anchorX="center"
            anchorY="middle"
          >
            {number}
          </Text>
        </Float>
      </group>
    </group>
  );
}

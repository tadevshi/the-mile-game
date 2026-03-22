import { useState } from 'react';
import Lottie from 'lottie-react';
import { motion } from 'framer-motion';

interface LottieAnimationProps {
  animationData: object;
  height?: number | string;
  width?: number | string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  fallback?: React.ReactNode;
}

export function LottieAnimation({
  animationData,
  height = 200,
  width = 200,
  loop = true,
  autoplay = true,
  className = '',
  fallback,
}: LottieAnimationProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      className={`relative ${className}`}
      style={{ height, width }}
    >
      {!isLoaded && fallback && (
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback}
        </div>
      )}
      <Lottie
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{ height: '100%', width: '100%' }}
        onDOMLoaded={() => setIsLoaded(true)}
      />
    </motion.div>
  );
}

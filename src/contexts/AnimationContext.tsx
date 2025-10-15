import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AnimationContextType {
  animations: string[];
  currentAnimation: string;
  isPlaying: boolean;
  mousePosition: { x: number; y: number };
  setAnimations: (animations: string[]) => void;
  setCurrentAnimation: (animation: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setMousePosition: (position: { x: number; y: number }) => void;
  handleAnimationChange: (animationName: string) => void;
  handlePlayPause: () => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};

interface AnimationProviderProps {
  children: ReactNode;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
  const [animations, setAnimations] = useState<string[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleAnimationChange = (animationName: string) => {
    setCurrentAnimation(animationName);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const value = {
    animations,
    currentAnimation,
    isPlaying,
    mousePosition,
    setAnimations,
    setCurrentAnimation,
    setIsPlaying,
    setMousePosition,
    handleAnimationChange,
    handlePlayPause
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}; 
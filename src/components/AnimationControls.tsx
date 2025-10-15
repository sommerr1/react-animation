import React from 'react';
import './AnimationControls.css';

interface AnimationControlsProps {
  animations: string[];
  currentAnimation: string;
  onAnimationChange: (animationName: string) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
}

export default function AnimationControls({ 
  animations, 
  currentAnimation, 
  onAnimationChange, 
  isPlaying, 
  onPlayPause 
}: AnimationControlsProps) {
  if (animations.length === 0) {
    return null;
  }

  return (
    <div className="animation-controls">
      <h3>Анимации</h3>
      <div className="animation-buttons">
        {animations.map((animation) => (
          <button
            key={animation}
            className={`animation-btn ${currentAnimation === animation ? 'active' : ''}`}
            onClick={() => onAnimationChange(animation)}
          >
            {animation}
          </button>
        ))}
      </div>
      <button 
        className={`play-pause-btn ${isPlaying ? 'pause' : 'play'}`}
        onClick={onPlayPause}
      >
        {isPlaying ? '⏸️ Пауза' : '▶️ Играть'}
      </button>
    </div>
  );
} 
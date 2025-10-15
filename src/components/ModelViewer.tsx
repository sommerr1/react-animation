import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import AnimationControls from './AnimationControls';
import { useAnimation } from '../contexts/AnimationContext';
import { useUI } from '../contexts/UIContext';

interface ModelViewerProps {
  modelPath: string;
  scale?: number;
  position?: [number, number, number];
  isNodding?: boolean;
  setIsNodding?: React.Dispatch<React.SetStateAction<boolean>>;
}

function Model({ modelPath, scale = 1, position = [0, 0, 0], isNodding, setIsNodding, isShaking, setIsShaking }: ModelViewerProps & { isShaking?: boolean; setIsShaking?: React.Dispatch<React.SetStateAction<boolean>> }) {
  const { scene, animations } = useGLTF(modelPath);
  const groupRef = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(animations, groupRef);
  const { setAnimations, setCurrentAnimation, currentAnimation, isPlaying, mousePosition } = useAnimation();
  const nodState = useRef({ direction: 1, angle: 0, count: 0, target: 2 }); // target: сколько кивков сделать
  const shakeState = useRef({ direction: 1, angle: 0, count: 0, target: 2 });

  // Обновляем список анимаций в контексте
  React.useEffect(() => {
    setAnimations(names);
  }, [names, setAnimations]);

  // Автоматически запускаем первую анимацию, если она есть
  React.useEffect(() => {
    if (names.length > 0 && !currentAnimation) {
      const firstAnimation = names[0];
      const action = actions[firstAnimation];
      if (action) {
        action.play();
        setCurrentAnimation(firstAnimation);
      }
    }
  }, [actions, names, currentAnimation, setCurrentAnimation]);

  // Обработка изменения анимации
  React.useEffect(() => {
    if (currentAnimation && actions[currentAnimation]) {
      // Останавливаем все анимации
      Object.values(actions).forEach(action => {
        if (action) {
          action.stop();
        }
      });
      
      // Запускаем выбранную анимацию
      const action = actions[currentAnimation];
      if (action) {
        action.play();
      }
    }
  }, [currentAnimation, actions]);

  // Обработка паузы/воспроизведения
  React.useEffect(() => {
    if (currentAnimation && actions[currentAnimation]) {
      const action = actions[currentAnimation];
      if (action) {
        action.paused = !isPlaying;
      }
    }
  }, [isPlaying, currentAnimation, actions]);

  // Плавное движение модели за мышкой
  useFrame((state) => {
    if (groupRef.current) {
      // Плавная интерполяция позиции
      if (isNodding) {
        const speed = 0.08;
        nodState.current.angle += speed * nodState.current.direction;
        groupRef.current.rotation.x = Math.sin(nodState.current.angle) * 0.5;
        if (nodState.current.angle > Math.PI / 2) {
          nodState.current.direction = -1;
          nodState.current.count++;
        }
        if (nodState.current.angle < 0) {
          nodState.current.direction = 1;
          nodState.current.count++;
        }
        // Двойной кивок (две пары вниз-вверх)
        if (nodState.current.count >= nodState.current.target * 2) {
          setIsNodding && setIsNodding(false);
          nodState.current.angle = 0;
          nodState.current.count = 0;
          groupRef.current.rotation.x = mousePosition.y * 0.2;
        }
      } else if (isShaking) {
        const speed = 0.10;
        shakeState.current.angle += speed * shakeState.current.direction;
        groupRef.current.rotation.y = Math.sin(shakeState.current.angle) * 0.7;
        if (shakeState.current.angle > Math.PI / 3) {
          shakeState.current.direction = -1;
          shakeState.current.count++;
        }
        if (shakeState.current.angle < -Math.PI / 3) {
          shakeState.current.direction = 1;
          shakeState.current.count++;
        }
        // Двойное "нет" (влево-вправо)
        if (shakeState.current.count >= shakeState.current.target * 2) {
          setIsShaking && setIsShaking(false);
          shakeState.current.angle = 0;
          shakeState.current.count = 0;
          groupRef.current.rotation.y = 0;
        }
      } else {
        groupRef.current.rotation.x = mousePosition.y * 0.2;
        groupRef.current.rotation.y = 0;
      }
    }
  });

  return (
    <group ref={groupRef} scale={scale} position={position}>
      <primitive object={scene} />
    </group>
  );
}

export default function ModelViewer({ modelPath, scale = 1, position = [0, 0, 0] }: ModelViewerProps) {
  const { animations, currentAnimation, isPlaying, handleAnimationChange, handlePlayPause } = useAnimation();
  const { showButtons, toggleButtons, backgroundImage, setBackgroundImage } = useUI();
  const [isNodding, setIsNodding] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Функция для запуска кивка
  const handleNod = () => {
    setIsNodding(true);
  };

  // Функция для запуска "нет"
  const handleShake = () => {
    setIsShaking(true);
  };


  // Функция для загрузки фонового изображения
  const handleBackgroundUpload = () => {
    fileInputRef.current?.click();
  };


  // Обработка выбора файла
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setBackgroundImage(result);
      };
      reader.readAsDataURL(file);
    }
  };



  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ 
          backgroundColor: '#000000',
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        
        <Suspense fallback={null}>
          <Model modelPath={modelPath} scale={scale} position={position} isNodding={isNodding} setIsNodding={setIsNodding} isShaking={isShaking} setIsShaking={setIsShaking} />
        </Suspense>
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />
        
        <Environment preset="sunset" />
      </Canvas>
      
      {/* Скрытый input для выбора файла */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      {/* Кнопка для скрытия/показа всех кнопок */}
      <button
        className="toggle-buttons-btn"
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1002,
          padding: '10px 15px',
          fontSize: '1rem',
          borderRadius: '8px',
          background: 'linear-gradient(90deg, #4a90e2 60%, #1e3c72 100%)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'all 0.2s',
        }}
        onClick={toggleButtons}
      >
        {showButtons ? '👁️ Скрыть управление' : '👁️‍🗨️ Показать управление'}
      </button>

      {/* Все остальные кнопки */}
      {showButtons && (
        <>
          <button
            className="nod-btn"
            onClick={handleNod}
          >
            🤖 Кивок
          </button>
          <button
            className="shake-btn"
            onClick={handleShake}
          >
            🙅‍♂️ Нет
          </button>
          
          {/* Кнопка загрузки фона */}
          <button
            className="background-upload-btn"
            style={{
              position: 'fixed',
              bottom: 32,
              left: 350,
              zIndex: 1001,
              padding: '14px 4px',
              fontSize: '1.2rem',
              borderRadius: '10px',
              background: 'linear-gradient(90deg, #ff9a56 60%, #1e3c72 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              transition: 'background 0.2s',
              width: 'fit-content',
            }}
            onClick={handleBackgroundUpload}
          >
            🖼️ Загрузить фон
          </button>
          
          
          {animations.length > 0 && (
            <AnimationControls
              animations={animations}
              currentAnimation={currentAnimation}
              onAnimationChange={handleAnimationChange}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
            />
          )}
        </>
      )}
    </div>
  );
} 
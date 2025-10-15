import React, { Suspense, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useTexture } from '@react-three/drei';
import { OBJLoader } from 'three-stdlib';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { useUI } from '../contexts/UIContext';

interface OBJViewerProps {
  objPath: string;
  texturePath?: string;
  selectedColor?: string | null;
  uploadedTexture?: string | null;
  scale?: number;
  position?: [number, number, number];
}

// Компонент для модели с текстурой
function OBJModelWithTexture({ objPath, texturePath, scale = 1, position = [0, 0, 0], isNodding, setIsNodding, isShaking, setIsShaking }: { objPath: string; texturePath: string; scale?: number; position?: [number, number, number]; isNodding?: boolean; setIsNodding?: React.Dispatch<React.SetStateAction<boolean>>; isShaking?: boolean; setIsShaking?: React.Dispatch<React.SetStateAction<boolean>> }) {
  const groupRef = useRef<THREE.Group>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const nodState = useRef({ direction: 1, angle: 0, count: 0, target: 2 });
  const shakeState = useRef({ direction: 1, angle: 0, count: 0, target: 2 });

  // Загружаем OBJ модель
  const obj = useLoader(OBJLoader, objPath);
  
  // Загружаем текстуру
  const texture = useTexture(texturePath);
  
  // Создаем материал с текстурой
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.2,
    });
  }, [texture]);

  // Клонируем модель и применяем материал ко всем мешам
  const modelWithTexture = useMemo(() => {
    const clonedObj = obj.clone();
    
    clonedObj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    return clonedObj;
  }, [obj, material]);

  // Анимация кивка
  useFrame(() => {
    if (groupRef.current && isNodding) {
      const currentAngle = nodState.current.angle;
      const direction = nodState.current.direction;
      const count = nodState.current.count;
      const target = nodState.current.target;

      if (count < target) {
        const newAngle = currentAngle + direction * 0.1;
        nodState.current.angle = newAngle;
        
        if (newAngle >= 0.3) {
          nodState.current.direction = -1;
        } else if (newAngle <= -0.3) {
          nodState.current.direction = 1;
          nodState.current.count++;
        }
        
        groupRef.current.rotation.x = newAngle;
      } else {
        groupRef.current.rotation.x = 0;
        nodState.current = { direction: 1, angle: 0, count: 0, target: 2 };
        setIsNodding?.(false);
      }
    }
  });

  // Анимация "нет"
  useFrame(() => {
    if (groupRef.current && isShaking) {
      const currentAngle = shakeState.current.angle;
      const direction = shakeState.current.direction;
      const count = shakeState.current.count;
      const target = shakeState.current.target;

      if (count < target) {
        const newAngle = currentAngle + direction * 0.2;
        shakeState.current.angle = newAngle;
        
        if (newAngle >= 0.4) {
          shakeState.current.direction = -1;
        } else if (newAngle <= -0.4) {
          shakeState.current.direction = 1;
          shakeState.current.count++;
        }
        
        groupRef.current.rotation.z = newAngle;
      } else {
        groupRef.current.rotation.z = 0;
        shakeState.current = { direction: 1, angle: 0, count: 0, target: 2 };
        setIsShaking?.(false);
      }
    }
  });

  return (
    <group ref={groupRef} scale={scale} position={position}>
      <primitive object={modelWithTexture} />
    </group>
  );
}

// Компонент для модели с цветом
function OBJModel({ objPath, selectedColor, scale = 1, position = [0, 0, 0], isNodding, setIsNodding, isShaking, setIsShaking }: { objPath: string; selectedColor?: string | null; scale?: number; position?: [number, number, number]; isNodding?: boolean; setIsNodding?: React.Dispatch<React.SetStateAction<boolean>>; isShaking?: boolean; setIsShaking?: React.Dispatch<React.SetStateAction<boolean>> }) {
  const groupRef = useRef<THREE.Group>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const nodState = useRef({ direction: 1, angle: 0, count: 0, target: 2 });
  const shakeState = useRef({ direction: 1, angle: 0, count: 0, target: 2 });

  // Загружаем OBJ модель
  const obj = useLoader(OBJLoader, objPath);
  
  // Создаем материал с цветом
  const material = useMemo(() => {
    if (selectedColor) {
      return new THREE.MeshStandardMaterial({
        color: selectedColor,
        roughness: 0.8,
        metalness: 0.2,
      });
    } else {
      return new THREE.MeshStandardMaterial({
        color: '#888888', // Серый по умолчанию
        roughness: 0.8,
        metalness: 0.2,
      });
    }
  }, [selectedColor]);

  // Клонируем модель и применяем материал ко всем мешам
  const modelWithTexture = useMemo(() => {
    const clonedObj = obj.clone();
    
    clonedObj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    return clonedObj;
  }, [obj, material]);

  // Анимация кивка, "нет" и следования за мышкой
  useFrame(() => {
    if (groupRef.current) {
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
    <group 
      ref={groupRef} 
      scale={scale} 
      position={position}
    >
      <primitive object={modelWithTexture} />
    </group>
  );
}

export default function OBJViewer({ objPath, texturePath, selectedColor, uploadedTexture, scale = 1, position = [0, 0, 0] }: OBJViewerProps) {
  const { showButtons, toggleButtons, backgroundImage, setBackgroundImage } = useUI();
  const [isNodding, setIsNodding] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);


  // Функции для анимаций
  const handleNod = () => {
    setIsNodding(true);
  };

  const handleShake = () => {
    setIsShaking(true);
  };


  // Функции для фона
  const handleBackgroundUpload = () => {
    backgroundInputRef.current?.click();
  };


  const handleBackgroundFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
          {uploadedTexture ? (
            <OBJModelWithTexture 
              objPath={objPath} 
              texturePath={uploadedTexture}
              scale={scale} 
              position={position}
              isNodding={isNodding}
              setIsNodding={setIsNodding}
              isShaking={isShaking}
              setIsShaking={setIsShaking}
            />
          ) : (
            <OBJModel 
              objPath={objPath} 
              selectedColor={selectedColor}
              scale={scale} 
              position={position}
              isNodding={isNodding}
              setIsNodding={setIsNodding}
              isShaking={isShaking}
              setIsShaking={setIsShaking}
            />
          )}
        </Suspense>
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />
        
        <Environment preset="sunset" />
      </Canvas>

      {/* Скрытый input для загрузки фона */}
      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/*"
        onChange={handleBackgroundFileChange}
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

      {/* Кнопки анимации и управления */}
      {showButtons && (
        <>
          <button
            className="nod-btn"
            onClick={handleNod}
            style={{
              position: 'fixed',
              bottom: 32,
              right: 32,
              zIndex: 1001,
              padding: '14px 28px',
              fontSize: '1.2rem',
              borderRadius: '10px',
              background: 'linear-gradient(90deg, #4CAF50 60%, #1e3c72 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              transition: 'background 0.2s',
            }}
          >
            🤖 Кивок
          </button>
          
          <button
            className="shake-btn"
            onClick={handleShake}
            style={{
              position: 'fixed',
              bottom: 32,
              right: 180,
              zIndex: 1001,
              padding: '14px 28px',
              fontSize: '1.2rem',
              borderRadius: '10px',
              background: 'linear-gradient(90deg, #FF9800 60%, #1e3c72 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              transition: 'background 0.2s',
            }}
          >
            🙅‍♂️ Нет
          </button>
          
          
          {/* Кнопка загрузки фона */}
          <button
            className="background-upload-btn"
            style={{
              position: 'fixed',
              bottom: 32,
              right: 580,
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
          
          
        </>
      )}

    </div>
  );
}

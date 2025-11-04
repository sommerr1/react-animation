import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setStatistics } from '../store/modelSlice';
import { calculateModelStatistics } from '../utils/modelStatistics';
import AnimationControls from './AnimationControls';
import ModelStatisticsDisplay from './ModelStatistics';
import { useAnimation } from '../contexts/AnimationContext';
import { useUI } from '../contexts/UIContext';

export interface NodeMaterialInfo {
  nodeName: string;
  materials: string[];
}

export interface MaterialGroup {
  id: string; // уникальный идентификатор группы (набор материалов)
  materialSet: string[]; // набор материалов (отсортированный для сравнения)
  nodes: THREE.Object3D[]; // ноды в этой группе
}

interface ModelViewerProps {
  modelPath: string;
  scale?: number;
  position?: [number, number, number];
  isNodding?: boolean;
  setIsNodding?: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMaterialGroups?: Map<string, string | null>; // группа -> выбранный материал
  onMaterialGroupsFound?: (groups: MaterialGroup[]) => void;
}

function Model({ modelPath, scale = 1, position = [0, 0, 0], isNodding, setIsNodding, isShaking, setIsShaking, selectedMaterialGroups, onMaterialGroupsFound }: ModelViewerProps & { isShaking?: boolean; setIsShaking?: React.Dispatch<React.SetStateAction<boolean>>; selectedMaterialGroups?: Map<string, string | null>; onMaterialGroupsFound?: (groups: MaterialGroup[]) => void }) {
  const { scene, animations, materials: gltfMaterials } = useGLTF(modelPath);
  const groupRef = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(animations, groupRef);
  const { setAnimations, setCurrentAnimation, currentAnimation, isPlaying, mousePosition } = useAnimation();
  const dispatch = useDispatch();
  const { invalidate } = useThree(); // Для принудительного обновления рендера
  const nodState = useRef({ direction: 1, angle: 0, count: 0, target: 2 }); // target: сколько кивков сделать
  const shakeState = useRef({ direction: 1, angle: 0, count: 0, target: 2 });
  const materialsRef = useRef<Map<string, THREE.Material>>(new Map());
  const originalMaterialsRef = useRef<Map<THREE.Object3D, Map<THREE.Mesh, THREE.Material | THREE.Material[]>>>(new Map());
  const nodeMaterialsMap = useRef<Map<THREE.Object3D, Set<string>>>(new Map());
  const materialGroupsRef = useRef<MaterialGroup[]>([]);

  // Функция для проверки, является ли имя материала дефолтным
  const isDefaultMaterialName = (name: string): boolean => {
    if (!name || name.trim() === '') return true;
    const defaultPatterns = [
      /^Material_\d+$/i,
      /^Материал\s*\d+$/i,
      /^Material\s*\d+$/i,
      /^GLTF_Material_\d+$/i,
      /^Material$/i,
      /^Материал$/i
    ];
    return defaultPatterns.some(pattern => pattern.test(name));
  };

  // Собираем ноды и их материалы, группируем по наборам материалов
  useEffect(() => {
    if (!scene || !gltfMaterials) return;
    
    // Функция для сбора всех материалов ноды из разных уровней
    const collectNodeMaterials = (node: THREE.Object3D): Set<string> => {
      const materialNames = new Set<string>();
      
      // Собираем материалы из всех мешей внутри ноды (включая дочерние ноды)
      // Это позволяет собрать все материалы, используемые этой нодой и её поддеревом
      node.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // 1. Материалы на уровне меша
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
              if (mat && mat.name && !isDefaultMaterialName(mat.name)) {
                materialNames.add(mat.name);
              }
            });
          }
          
          // 2. Материалы из geometry.groups (примитивы)
          if (child.geometry && child.geometry.groups) {
            child.geometry.groups.forEach((group: { materialIndex?: number }) => {
              if (group.materialIndex !== undefined && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                const mat = materials[group.materialIndex];
                if (mat && mat.name && !isDefaultMaterialName(mat.name)) {
                  materialNames.add(mat.name);
                }
              }
            });
          }
        }
      });
      
      return materialNames;
    };
    
    materialsRef.current.clear();
    originalMaterialsRef.current.clear();
    nodeMaterialsMap.current.clear();
    
    console.log('[ModelViewer] Начинаем сбор нод и материалов...');
    
    // Сначала собираем все материалы из GLTF в реф
    const gltfMaterialsArray = Array.isArray(gltfMaterials) 
      ? gltfMaterials 
      : Object.values(gltfMaterials) as THREE.Material[];
    
    gltfMaterialsArray.forEach((mat) => {
      if (mat && mat.name && !isDefaultMaterialName(mat.name)) {
        materialsRef.current.set(mat.name, mat);
      }
    });
    
    // Собираем все ноды с их материалами
    const nodeInfoList: NodeMaterialInfo[] = [];
    const allNodes: THREE.Object3D[] = [];
    const nodeMeshesMap = new Map<THREE.Object3D, THREE.Mesh[]>();
    
    scene.traverse((node) => {
      // Пропускаем саму сцену
      if (node === scene) return;
      
      const nodeName = node.name || 'unnamed';
      
      // Собираем все материалы ноды
      const nodeMaterials = collectNodeMaterials(node);
      
      // Если нода не содержит материалов, пропускаем
      if (nodeMaterials.size === 0) return;
      
      // Проверяем, не является ли нода SINGLE (один материал с префиксом SINGLE)
      const materialsArray = Array.from(nodeMaterials);
      if (materialsArray.length === 1 && materialsArray[0].includes('SINGLE')) {
        console.log(`[ModelViewer] ⊘ Нода "${nodeName}" пропущена (SINGLE материал): ${materialsArray[0]}`);
        return;
      }
      
      // Сохраняем материалы для этой ноды
      nodeMaterialsMap.current.set(node, nodeMaterials);
      allNodes.push(node);
      
      // Сохраняем все меши этой ноды для последующего применения материалов
      const meshesInNode: THREE.Mesh[] = [];
      node.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshesInNode.push(child);
          // Сохраняем оригинальные материалы каждого меша
          if (!originalMaterialsRef.current.has(node)) {
            originalMaterialsRef.current.set(node, new Map());
          }
          const nodeMeshesMap = originalMaterialsRef.current.get(node)!;
          if (child.material) {
            const origMat = child.material;
            if (Array.isArray(origMat)) {
              nodeMeshesMap.set(child, origMat.map(m => m.clone()));
            } else {
              nodeMeshesMap.set(child, origMat.clone());
            }
          }
        }
      });
      nodeMeshesMap.set(node, meshesInNode);
      
      nodeInfoList.push({
        nodeName,
        materials: materialsArray
      });
      
      console.log(`[ModelViewer] Нода "${nodeName}": материалы [${materialsArray.join(', ')}]`);
    });
    
    // Выводим список в консоль
    console.log('[ModelViewer] ========== СПИСОК НОД И МАТЕРИАЛОВ ==========');
    nodeInfoList.forEach((info) => {
      console.log(`${info.nodeName}: ${info.materials.join(', ')}`);
    });
    console.log('[ModelViewer] ==============================================');
    
    // Фильтруем: убираем пустые, дефолтные и с одним материалом
    const filteredNodeInfo = nodeInfoList.filter((info) => {
      // Пропускаем пустые
      if (info.materials.length === 0) {
        console.log(`[ModelViewer] ⊘ Нода "${info.nodeName}" отфильтрована (пустой список материалов)`);
        return false;
      }
      
      // Пропускаем с одним материалом
      if (info.materials.length === 1) {
        console.log(`[ModelViewer] ⊘ Нода "${info.nodeName}" отфильтрована (только один материал)`);
        return false;
      }
      
      // Пропускаем дефолтные материалы
      const hasOnlyDefaults = info.materials.every(mat => isDefaultMaterialName(mat));
      if (hasOnlyDefaults) {
        console.log(`[ModelViewer] ⊘ Нода "${info.nodeName}" отфильтрована (только дефолтные материалы)`);
        return false;
      }
      
      return true;
    });
    
    console.log(`[ModelViewer] После фильтрации осталось ${filteredNodeInfo.length} нод`);
    
    // Группируем ноды с одинаковым набором материалов (порядок не важен)
    const groupsMap = new Map<string, MaterialGroup>();
    
    filteredNodeInfo.forEach((info) => {
      // Создаем ключ из отсортированного массива материалов
      const sortedMaterials = [...info.materials].sort();
      const groupKey = sortedMaterials.join('|');
      
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          id: `group_${groupsMap.size + 1}`,
          materialSet: sortedMaterials,
          nodes: []
        });
      }
      
      // Находим соответствующую ноду
      const node = allNodes.find(n => (n.name || 'unnamed') === info.nodeName);
      if (node && groupsMap.has(groupKey)) {
        groupsMap.get(groupKey)!.nodes.push(node);
      }
    });
    
    const groups = Array.from(groupsMap.values());
    
    console.log(`[ModelViewer] Создано ${groups.length} групп материалов:`);
    groups.forEach((group, idx) => {
      console.log(`[ModelViewer] Группа ${idx + 1} (${group.id}): материалы [${group.materialSet.join(', ')}], нод: ${group.nodes.length}`);
    });
    
    materialGroupsRef.current = groups;
    
    // Уведомляем родительский компонент
    if (onMaterialGroupsFound) {
      onMaterialGroupsFound(groups);
    }
  }, [scene, gltfMaterials, onMaterialGroupsFound]);

  // Функция для глубокого клонирования материала со всеми текстурами
  const cloneMaterialDeep = (mat: THREE.Material, newName: string): THREE.Material => {
    const cloned = mat.clone();
    cloned.name = newName;
    cloned.needsUpdate = true;
    
    const sourceMat = mat as any;
    const targetMat = cloned as any;
    
    // Клонируем все текстуры материала
    const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap', 'alphaMap', 'lightMap', 'envMap'];
    textureProps.forEach(prop => {
      if (sourceMat[prop] && sourceMat[prop] instanceof THREE.Texture) {
        targetMat[prop] = sourceMat[prop].clone();
        if (targetMat[prop]) {
          targetMat[prop].needsUpdate = true;
          if (targetMat[prop].updateMatrix) {
            targetMat[prop].updateMatrix();
          }
        }
      }
    });
    
    return cloned;
  };

  // Применение материалов к группам нод
  useEffect(() => {
    if (!scene || !selectedMaterialGroups) return;
    
    console.log('[ModelViewer] 🔄 Начало применения материалов к группам нод...');
    
    let totalApplied = 0;
    
    // Проходим по всем группам
    materialGroupsRef.current.forEach((group) => {
      const selectedMaterial = selectedMaterialGroups.get(group.id);
      
      if (!selectedMaterial || !materialsRef.current.has(selectedMaterial)) {
        // Если материал не выбран или не найден, восстанавливаем оригинальные материалы
        group.nodes.forEach((node) => {
          const nodeMeshesMap = originalMaterialsRef.current.get(node);
          if (nodeMeshesMap) {
            node.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                const originalMaterial = nodeMeshesMap.get(child);
                if (originalMaterial) {
                  if (Array.isArray(originalMaterial)) {
                    child.material = originalMaterial.map(m => m.clone());
                  } else {
                    child.material = (originalMaterial as THREE.Material).clone();
                  }
                }
              }
            });
          }
        });
        return;
      }
      
      const targetMaterial = materialsRef.current.get(selectedMaterial)!;
      console.log(`[ModelViewer] Применяем материал "${selectedMaterial}" к группе ${group.id} (${group.nodes.length} нод)`);
      
      // Применяем выбранный материал ко всем нодам группы
      group.nodes.forEach((node) => {
        // Проходим по всем мешам внутри ноды
        node.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const clonedMaterial = cloneMaterialDeep(targetMaterial, selectedMaterial);
            
            // Получаем оригинальный материал для этого меша
            const nodeMeshesMap = originalMaterialsRef.current.get(node);
            const originalMaterial = nodeMeshesMap?.get(child);
            const wasMultipl = originalMaterial && Array.isArray(originalMaterial);
            
            if (wasMultipl) {
              // Для multipl-объектов: заменяем ВСЕ материалы на выбранный
              child.material = clonedMaterial;
              
              // Обновляем materialIndex для всех граней геометрии
              if (child.geometry && child.geometry.groups) {
                child.geometry.groups.forEach((group: { start: number; count: number; materialIndex?: number }) => {
                  group.materialIndex = 0;
                });
                // Обновляем атрибуты геометрии
                if (child.geometry.attributes) {
                  Object.values(child.geometry.attributes).forEach(attr => {
                    if (attr && typeof attr === 'object' && 'needsUpdate' in attr) {
                      (attr as any).needsUpdate = true;
                    }
                  });
                }
              }
            } else {
              // Один материал - просто заменяем
              child.material = clonedMaterial;
            }
            
            // Обновляем материал и текстуры
            const updateMaterialTextures = (mat: THREE.Material) => {
              if (!mat) return;
              mat.needsUpdate = true;
              const matAny = mat as any;
              const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap', 'alphaMap', 'lightMap', 'envMap'];
              textureProps.forEach(prop => {
                if (matAny[prop] && matAny[prop] instanceof THREE.Texture) {
                  const texture = matAny[prop] as THREE.Texture;
                  texture.needsUpdate = true;
                  if (texture.updateMatrix) {
                    texture.updateMatrix();
                  }
                }
              });
            };
            
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(updateMaterialTextures);
              } else {
                updateMaterialTextures(child.material);
              }
            }
            
            // Принудительно обновляем геометрию
            if (child.geometry) {
              // Обновляем атрибуты геометрии
              if (child.geometry.attributes) {
                Object.values(child.geometry.attributes).forEach(attr => {
                  if (attr && typeof attr === 'object' && 'needsUpdate' in attr) {
                    (attr as any).needsUpdate = true;
                  }
                });
              }
              if (child.geometry.computeBoundingBox) {
                child.geometry.computeBoundingBox();
              }
              if (child.geometry.computeBoundingSphere) {
                child.geometry.computeBoundingSphere();
              }
            }
            
            child.updateMatrix();
            child.updateMatrixWorld(true);
            child.visible = false;
            child.visible = true;
            
            totalApplied++;
          }
        });
      });
    });
    
    if (totalApplied > 0) {
      console.log(`[ModelViewer] ✅ Итого: применено к ${totalApplied} мешам в нодах`);
      invalidate();
    }
  }, [scene, selectedMaterialGroups, invalidate]);

  // Вычисляем статистику модели после загрузки
  useEffect(() => {
    if (scene) {
      // calculateModelStatistics принимает THREE.Object3D (Group или Scene)
      const stats = calculateModelStatistics(scene, animations);
      dispatch(setStatistics(stats));
    }
    // Очищаем статистику при размонтировании
    return () => {
      dispatch(setStatistics(null));
    };
  }, [scene, animations, dispatch]);

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

export default function ModelViewer({ modelPath, scale = 1, position = [0, 0, 0], selectedMaterialGroups, onMaterialGroupsFound }: ModelViewerProps) {
  const { animations, currentAnimation, isPlaying, handleAnimationChange, handlePlayPause } = useAnimation();
  const { showButtons, toggleButtons, backgroundImage, setBackgroundImage } = useUI();
  const [isNodding, setIsNodding] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statistics = useSelector((state: RootState) => state.model.statistics);
  const models = useSelector((state: RootState) => state.model.models);
  const selectedModel = useSelector((state: RootState) => state.model.selectedModel);
  const selectedModelData = models.find(model => model.id === selectedModel);

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
          <Model 
            modelPath={modelPath} 
            scale={scale} 
            position={position} 
            isNodding={isNodding} 
            setIsNodding={setIsNodding} 
            isShaking={isShaking} 
            setIsShaking={setIsShaking}
            selectedMaterialGroups={selectedMaterialGroups}
            onMaterialGroupsFound={onMaterialGroupsFound}
          />
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

      {/* Компонент статистики модели */}
      <ModelStatisticsDisplay 
        statistics={statistics} 
        modelName={selectedModelData?.name}
      />

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
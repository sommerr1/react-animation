import * as THREE from 'three';
import { ModelStatistics } from '../store/modelSlice';

/**
 * Вычисляет статистику по 3D модели из THREE.Group или THREE.Scene
 * Принимает THREE.Object3D для совместимости с разными типами из useGLTF
 */
export function calculateModelStatistics(scene: THREE.Object3D, animations: THREE.AnimationClip[] = []): ModelStatistics {
  // Проверяем тип входного объекта - должен быть Group или Scene
  const isGroup = scene instanceof THREE.Group;
  const isScene = scene instanceof THREE.Scene;
  
  if (!isGroup && !isScene) {
    // Если это не Group и не Scene, но имеет метод traverse, все равно попробуем обработать
    if (typeof (scene as any).traverse !== 'function') {
      throw new Error('Expected THREE.Group or THREE.Scene, got ' + scene.constructor.name);
    }
  }

  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let vertices = 0;
  let faces = 0;
  let meshes = 0;
  let bones = 0;

  scene.traverse((object) => {
    // Подсчет мешей
    if (object instanceof THREE.Mesh) {
      meshes++;
      
      const geometry = object.geometry;
      
      // Подсчет вершин
      if (geometry.attributes.position) {
        vertices += geometry.attributes.position.count;
      }
      
      // Подсчет граней (faces)
      if (geometry.index) {
        faces += geometry.index.count / 3; // Каждая грань состоит из 3 индексов
      } else {
        // Если нет индексов, считаем по позициям
        faces += geometry.attributes.position.count / 3;
      }
      
      // Собираем материалы
      if (Array.isArray(object.material)) {
        object.material.forEach(mat => {
          materials.add(mat);
        });
      } else if (object.material) {
        materials.add(object.material);
      }
    }
    
    // Подсчет костей (bones)
    if (object instanceof THREE.Bone || (object as any).isBone) {
      bones++;
    }
    
    // Подсчет текстур из материалов
    if (object instanceof THREE.Mesh && object.material) {
      const material = object.material;
      
      if (Array.isArray(material)) {
        material.forEach(mat => {
          extractTextures(mat, textures);
        });
      } else {
        extractTextures(material, textures);
      }
    }
  });

  return {
    materials: materials.size,
    vertices: Math.round(vertices),
    faces: Math.round(faces),
    meshes,
    textures: textures.size,
    animations: animations.length,
    bones
  };
}

/**
 * Извлекает все текстуры из материала
 */
function extractTextures(material: THREE.Material, textures: Set<THREE.Texture>): void {
  // Проверяем все стандартные свойства материалов, которые могут содержать текстуры
  const textureProperties = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
    'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap',
    'alphaMap', 'envMap', 'lightMap', 'specularMap'
  ];
  
  textureProperties.forEach(prop => {
    const texture = (material as any)[prop];
    if (texture instanceof THREE.Texture) {
      textures.add(texture);
    }
  });
}


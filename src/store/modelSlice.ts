import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ModelInfo {
  id: string;
  name: string;
  path: string;
  description?: string;
  type: 'glb' | 'obj';
  texturePath?: string;
  thumbnail?: string;
}

interface ModelState {
  selectedModel: string;
  models: ModelInfo[];
  isLoading: boolean;
  error: string | null;
  selectedTexture: string | null;
}

const initialState: ModelState = {
  selectedModel: '',
  models: [
    {
      id: 'Koltuk',
      name: 'Koltuk',
      path: '/models/Koltuk.obj',
      description: 'Sofa',
      type: 'obj',
      texturePath: '/textures/wood.svg'
    },
        {
      id: 'sofa',
      name: 'Sofa',
      path: '/models/aKoltuk.glb',
      description: 'Классический диван',
      type: 'glb'
    },
    {
      id: 'creeper',
      name: 'Creeper',
      path: '/models/hd_creeper.glb',
      description: 'Классический моб из Minecraft',
      type: 'glb'
    },
	{
      id: 'mark_23',
      name: 'Mark_23',
      path: '/models/mark_23__animated_free.glb',
      description: 'Пистолет',
      type: 'glb'
    },
    {
      id: 'zombie',
      name: 'Zombie',
      path: '/models/zombie.glb',
      description: 'Зомби из Minecraft',
      type: 'glb'
    },
    {
      id: 'large-zombie',
      name: 'Large Zombie',
      path: '/models/large_zombie.glb',
      description: 'Большой зомби',
      type: 'glb'
    },
    {
      id: 'ghast',
      name: 'Ghast',
      path: '/models/hd_ghast.glb',
      description: 'Призрачный моб из Нижнего мира',
      type: 'glb'
    },
    {
      id: 'enderman',
      name: 'Angry Enderman',
      path: '/models/angry_enderman.glb',
      description: 'Сердитый Эндермен',
      type: 'glb'
    },
    {
      id: 'swan',
      name: 'Minecraft Swan',
      path: '/models/minecraft_swan_model_version_1.glb',
      description: 'Лебедь из Minecraft',
      type: 'glb'
    },
    {
      id: 'bee',
      name: 'Bee',
      path: '/models/minecraft_-_bee.glb',
      description: 'Пчела из Minecraft',
      type: 'glb'
    },
    {
      id: 'spongebob',
      name: 'SpongeBob',
      path: '/models/spongebob_-_minecraft_dlc_free_to_download.glb',
      description: 'SpongeBob Minecraft DLC',
      type: 'glb'
    },
    {
      id: 'rainbow-dragon',
      name: 'Rainbow Dragon',
      path: '/models/minecraft_rainbow_dragon.glb',
      description: 'Радужный дракон из Minecraft',
      type: 'glb'
    },
    {
      id: 'axolotl',
      name: 'Axolotl',
      path: '/models/minecraft_axolotl__free_download.glb',
      description: 'Аксолотль из Minecraft',
      type: 'glb'
    },
    {
      id: 'phantom',
      name: 'Advanced Phantom',
      path: '/models/minecraft_advenced_phantom_free_download.glb',
      description: 'Продвинутый фантом из Minecraft',
      type: 'glb'
    },
    {
      id: 'fox',
      name: 'Fox',
      path: '/models/fox_minecraft.glb',
      description: 'Лиса из Minecraft',
      type: 'glb'
    },
    // Примеры OBJ моделей (добавьте свои OBJ файлы в папку public/models/)
    {
      id: 'cube-obj',
      name: 'Cube (OBJ)',
      path: '/models/cube.obj',
      description: 'Простой куб для тестирования текстур',
      type: 'obj',
      texturePath: '/textures/wood.svg'
    },
    {
      id: 'sphere-obj',
      name: 'Sphere (OBJ)',
      path: '/models/sphere.obj',
      description: 'Сфера для демонстрации текстур',
      type: 'obj',
      texturePath: '/textures/metal.svg'
    }
  ],
  isLoading: false,
  error: null,
  selectedTexture: null
};

const modelSlice = createSlice({
  name: 'model',
  initialState,
  reducers: {
    setSelectedModel: (state, action: PayloadAction<string>) => {
      state.selectedModel = action.payload;
    },
    setModels: (state, action: PayloadAction<ModelInfo[]>) => {
      state.models = action.payload;
    },
    addModel: (state, action: PayloadAction<ModelInfo>) => {
      state.models.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setSelectedTexture: (state, action: PayloadAction<string | null>) => {
      state.selectedTexture = action.payload;
    }
  }
});

export const { 
  setSelectedModel, 
  setModels, 
  addModel, 
  setLoading, 
  setError,
  setSelectedTexture
} = modelSlice.actions;

export default modelSlice.reducer; 
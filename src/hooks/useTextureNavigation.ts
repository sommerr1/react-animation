import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setSelectedTexture } from '../store/modelSlice';

// Предустановленные текстуры из TexturePanel
const presetTextures = [
  '/textures/wood.svg',
  '/textures/metal.svg',
  '/textures/stone.svg',
  '/textures/fabric.svg',
  '/textures/leather.svg'
];

export const useTextureNavigation = () => {
  const dispatch = useDispatch();
  const { selectedTexture } = useSelector((state: RootState) => state.model);

  const nextTexture = useCallback(() => {
    const currentIndex = presetTextures.findIndex(texture => texture === selectedTexture);
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % presetTextures.length;
      dispatch(setSelectedTexture(presetTextures[nextIndex]));
    } else {
      dispatch(setSelectedTexture(presetTextures[0]));
    }
  }, [selectedTexture, dispatch]);

  const previousTexture = useCallback(() => {
    const currentIndex = presetTextures.findIndex(texture => texture === selectedTexture);
    if (currentIndex !== -1) {
      const prevIndex = currentIndex === 0 ? presetTextures.length - 1 : currentIndex - 1;
      dispatch(setSelectedTexture(presetTextures[prevIndex]));
    } else {
      dispatch(setSelectedTexture(presetTextures[0]));
    }
  }, [selectedTexture, dispatch]);

  return {
    nextTexture,
    previousTexture,
    currentTexture: selectedTexture
  };
};

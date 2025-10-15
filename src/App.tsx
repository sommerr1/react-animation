import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store/store';
import ModelViewer from './components/ModelViewer';
import OBJViewer from './components/OBJViewer';
import ModelSelector from './components/ModelSelector';
import TexturePanel from './components/TexturePanel';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store/store';
import { setSelectedModel } from './store/modelSlice';
import { AnimationProvider } from './contexts/AnimationContext';
import { UIProvider, useUI } from './contexts/UIContext';
import './App.css';

function AppContent() {
  const dispatch = useDispatch();
  const { models, selectedModel } = useSelector((state: RootState) => state.model);
  const { showButtons } = useUI();
  const [selectedColor, setSelectedColor] = React.useState<string | null>(null);
  const [uploadedTexture, setUploadedTexture] = React.useState<string | null>(null);

  const handleModelSelect = (modelId: string) => {
    dispatch(setSelectedModel(modelId));
  };

  const selectedModelData = models.find(model => model.id === selectedModel);

  return (
    <div className="App">
      <header className="App-header">
        <h1>3D Model Viewer</h1>
        <p>Интерактивный просмотр 3D-моделей</p>
      </header>
      
      <main className="App-main">
        <div className="viewer-container">
          {selectedModelData ? (
            selectedModelData.type === 'obj' ? (
              <OBJViewer 
                objPath={selectedModelData.path}
                texturePath={selectedModelData.texturePath}
                selectedColor={selectedColor}
                uploadedTexture={uploadedTexture}
                scale={1}
                position={[0, 0, 0]}
              />
            ) : (
              <ModelViewer 
                modelPath={selectedModelData.path}
                scale={1}
                position={[0, 0, 0]}
              />
            )
          ) : (
            <div className="no-model-selected">
              <h2>Выберите модель для просмотра</h2>
              <p>Используйте панель слева для выбора 3D-модели</p>
              <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                <h3>Поддерживаемые форматы:</h3>
                <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                  <li><strong>GLB</strong> - модели с анимацией (Minecraft мобы)</li>
                  <li><strong>OBJ</strong> - модели с поддержкой текстур</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        
        {showButtons && (
          <div className="selector-container">
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onModelSelect={handleModelSelect}
            />
            <TexturePanel
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              uploadedTexture={uploadedTexture}
              setUploadedTexture={setUploadedTexture}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <UIProvider>
        <AnimationProvider>
          <Router>
            <Routes>
              <Route path="/" element={<AppContent />} />
            </Routes>
          </Router>
        </AnimationProvider>
      </UIProvider>
    </Provider>
  );
}

export default App;

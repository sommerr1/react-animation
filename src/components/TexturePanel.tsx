import React, { useRef } from 'react';

interface TexturePanelProps {
  selectedColor: string | null;
  setSelectedColor: (color: string | null) => void;
  uploadedTexture: string | null;
  setUploadedTexture: (texture: string | null) => void;
  glbMaterials?: string[];
  selectedGlbMaterial?: string | null;
  setSelectedGlbMaterial?: (material: string | null) => void;
  modelType?: 'glb' | 'obj';
}

function TexturePanel({ 
  selectedColor, 
  setSelectedColor, 
  uploadedTexture, 
  setUploadedTexture,
  glbMaterials = [],
  selectedGlbMaterial,
  setSelectedGlbMaterial,
  modelType
}: TexturePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Автоматически выбираем материал, если он один
  React.useEffect(() => {
    if (modelType === 'glb' && glbMaterials.length === 1 && !selectedGlbMaterial) {
      if (setSelectedGlbMaterial) {
        setSelectedGlbMaterial(glbMaterials[0]);
      }
    }
  }, [glbMaterials, selectedGlbMaterial, modelType, setSelectedGlbMaterial]);

  // Предустановленные цвета
  const presetColors = [
    { name: 'Белый', color: '#FFFFFF' },
    { name: 'Черный', color: '#000000' },
    { name: 'Красный', color: '#FF0000' },
    { name: 'Темно-синий', color: '#000080' },
    { name: 'Темно-зеленый', color: '#006400' },
    { name: 'Желтый', color: '#FFFF00' },
    { name: 'Коричневый', color: '#8B4513' },
    { name: 'Розовый', color: '#FF69B4' },
    { name: 'Оранжевый', color: '#FFA500' },
    { name: 'Фиолетовый', color: '#800080' },
    { name: 'Голубой', color: '#00BFFF' },
    { name: 'Лайм', color: '#32CD32' },
    { name: 'Золотой', color: '#FFD700' },
    { name: 'Серебряный', color: '#C0C0C0' },
    { name: 'Бордовый', color: '#800020' },
    { name: 'Бирюзовый', color: '#40E0D0' },
    { name: 'Лавандовый', color: '#E6E6FA' },
    { name: 'Коралловый', color: '#FF7F50' },
    { name: 'Мятный', color: '#98FB98' },
  ];

  // Функция для загрузки пользовательской текстуры
  const handleTextureUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedTexture(result);
        setSelectedColor(null); // Сбрасываем выбранный цвет при загрузке текстуры
      };
      reader.readAsDataURL(file);
    }
  };

  // CSS стили для скроллбара
  const scrollbarStyles = `
    .color-scroll::-webkit-scrollbar {
      height: 6px;
    }
    .color-scroll::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
    }
    .color-scroll::-webkit-scrollbar-thumb {
      background: #4a90e2;
      border-radius: 3px;
    }
    .color-scroll::-webkit-scrollbar-thumb:hover {
      background: #357abd;
    }
  `;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '15px',
        borderRadius: '10px',
        color: 'white',
        marginTop: '10px',
      }}
    >
      <style>{scrollbarStyles}</style>
      
      <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem' }}>
        🎨 Текстуры
      </h3>

      {/* Материалы GLB модели */}
      {modelType === 'glb' && glbMaterials.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ 
            fontSize: '0.9rem', 
            marginBottom: '8px', 
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 'bold'
          }}>
            Материалы модели:
          </div>
          <select
            value={selectedGlbMaterial || (glbMaterials.length === 1 ? glbMaterials[0] : '')}
            onChange={(e) => {
              const selectedValue = e.target.value;
              if (setSelectedGlbMaterial && selectedValue) {
                setSelectedGlbMaterial(selectedValue);
              }
              // Сбрасываем OBJ текстуры при переключении GLB материалов
              setSelectedColor(null);
              setUploadedTexture(null);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.85rem',
              borderRadius: '5px',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              paddingRight: '35px',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4a90e2';
              e.target.style.boxShadow = '0 0 10px rgba(74, 144, 226, 0.5)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.3)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {!selectedGlbMaterial && glbMaterials.length > 1 && (
              <option value="" disabled style={{ background: '#2a2a2a', color: 'rgba(255,255,255,0.5)' }}>
                Выберите материал...
              </option>
            )}
            {glbMaterials.map((materialName, index) => (
              <option 
                key={materialName || index} 
                value={materialName}
                style={{ background: '#2a2a2a', color: 'white' }}
              >
                {materialName || `Материал ${index + 1}`}
              </option>
            ))}
          </select>
          {glbMaterials.length > 1 && selectedGlbMaterial && (
            <div style={{ 
              marginTop: '8px', 
              fontSize: '0.7rem', 
              color: 'rgba(255,255,255,0.7)',
              fontStyle: 'italic'
            }}>
              Выбран: <strong>{selectedGlbMaterial}</strong>
            </div>
          )}
        </div>
      )}

      {/* Разделитель, если есть и GLB материалы, и OBJ опции */}
      {modelType === 'glb' && glbMaterials.length > 0 && (
        <div style={{ 
          height: '1px', 
          background: 'rgba(255,255,255,0.2)', 
          margin: '15px 0' 
        }} />
      )}

      {/* Предустановленные цвета (только для OBJ) */}
      {modelType === 'obj' && (
      <div style={{ marginBottom: '15px' }}>
        <div 
          className="color-scroll"
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            padding: '10px 0',
            scrollbarWidth: 'thin',
            scrollbarColor: '#4a90e2 #333',
            width: '100%',
            maxWidth: '232px' // 4 цвета * 50px + 3 промежутка * 8px + отступы = 232px
          }}>
          {presetColors.map((colorItem, index) => (
            <div
              key={index}
              onClick={() => {
                setSelectedColor(colorItem.color);
                setUploadedTexture(null); // Сбрасываем загруженную текстуру при выборе цвета
              }}
              style={{
                minWidth: '50px',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '3px solid',
                borderColor: selectedColor === colorItem.color ? '#4a90e2' : 'rgba(255,255,255,0.3)',
                background: colorItem.color,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: selectedColor === colorItem.color ? '0 0 15px rgba(74, 144, 226, 0.6)' : '0 2px 8px rgba(0,0,0,0.3)',
                transform: selectedColor === colorItem.color ? 'scale(1.1)' : 'scale(1)',
                flexShrink: 0 // Предотвращает сжатие элементов при скроллинге
              }}
              title={colorItem.name}
            >
              {selectedColor === colorItem.color && (
                <div style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#4a90e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'white'
                }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ 
          marginTop: '8px', 
          fontSize: '0.7rem', 
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center'
        }}>
          Прокрутите для выбора цвета
        </div>
      </div>
      )}

      {/* Загрузка пользовательской текстуры (только для OBJ) */}
      {modelType === 'obj' && (
      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={handleTextureUpload}
          style={{
            padding: '8px 15px',
            fontSize: '0.9rem',
            borderRadius: '5px',
            border: 'none',
            background: '#ff9a56',
            color: 'white',
            cursor: 'pointer',
            width: '100%',
            transition: 'background 0.2s',
          }}
        >
          📁 Загрузить свою
        </button>
      </div>
      )}
      
      {/* Сообщение, если это GLB без материалов */}
      {modelType === 'glb' && glbMaterials.length === 0 && (
        <div style={{ 
          padding: '10px', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '5px',
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center'
        }}>
          Загрузка материалов...
        </div>
      )}

      {/* Скрытый input для загрузки файлов */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default TexturePanel;

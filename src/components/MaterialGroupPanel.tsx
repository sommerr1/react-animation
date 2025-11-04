import React from 'react';
import { MaterialGroup } from './ModelViewer';

interface MaterialGroupPanelProps {
  groups: MaterialGroup[];
  selectedMaterials: Map<string, string | null>; // группа -> выбранный материал
  onMaterialSelect: (groupId: string, materialName: string | null) => void;
  allMaterials: string[]; // все доступные материалы
}

function MaterialGroupPanel({ 
  groups, 
  selectedMaterials, 
  onMaterialSelect,
  allMaterials 
}: MaterialGroupPanelProps) {
  // Ограничиваем до 3 групп
  const displayGroups = groups.slice(0, 3);

  if (displayGroups.length === 0) {
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
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem' }}>
          🎨 Материалы
        </h3>
        <div style={{ 
          padding: '10px', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '5px',
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center'
        }}>
          Нет групп материалов для выбора
        </div>
      </div>
    );
  }

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
      <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem' }}>
        🎨 Материалы
      </h3>

      {displayGroups.map((group, index) => {
        const selectedMaterial = selectedMaterials.get(group.id) || null;
        
        return (
          <div key={group.id} style={{ marginBottom: index < displayGroups.length - 1 ? '15px' : '0' }}>
            <div style={{ 
              fontSize: '0.9rem', 
              marginBottom: '8px', 
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 'bold'
            }}>
              Группа {index + 1} ({group.materialSet.join(', ')}):
            </div>
            <select
              value={selectedMaterial || ''}
              onChange={(e) => {
                const value = e.target.value;
                onMaterialSelect(group.id, value || null);
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
              <option value="" style={{ background: '#2a2a2a', color: 'rgba(255,255,255,0.5)' }}>
                Выберите материал...
              </option>
              {allMaterials.map((materialName) => (
                <option 
                  key={materialName} 
                  value={materialName}
                  style={{ background: '#2a2a2a', color: 'white' }}
                >
                  {materialName}
                </option>
              ))}
            </select>
            {selectedMaterial && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '0.7rem', 
                color: 'rgba(255,255,255,0.7)',
                fontStyle: 'italic'
              }}>
                Выбран: <strong>{selectedMaterial}</strong>
              </div>
            )}
            {index < displayGroups.length - 1 && (
              <div style={{ 
                height: '1px', 
                background: 'rgba(255,255,255,0.2)', 
                margin: '15px 0 0 0' 
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default MaterialGroupPanel;


import React from 'react';
import { ModelStatistics } from '../store/modelSlice';

interface ModelStatisticsProps {
  statistics: ModelStatistics | null;
  modelName?: string;
}

export default function ModelStatisticsDisplay({ statistics, modelName }: ModelStatisticsProps) {
  if (!statistics) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        left: 20,
        zIndex: 1001,
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        minWidth: '250px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        📊 Статистика модели
      </h3>
      {modelName && (
        <div style={{ marginBottom: '8px', opacity: 0.8, fontSize: '12px' }}>
          {modelName}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <StatItem label="Материалы" value={statistics.materials} icon="🎨" />
        <StatItem label="Вершины" value={statistics.vertices.toLocaleString()} icon="📍" />
        <StatItem label="Грани" value={statistics.faces.toLocaleString()} icon="🔺" />
        <StatItem label="Меши" value={statistics.meshes} icon="📦" />
        <StatItem label="Текстуры" value={statistics.textures} icon="🖼️" />
        <StatItem label="Анимации" value={statistics.animations} icon="🎬" />
        <StatItem label="Кости" value={statistics.bones} icon="🦴" />
      </div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string | number;
  icon: string;
}

function StatItem({ label, value, icon }: StatItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{icon}</span>
        <span>{label}:</span>
      </span>
      <span style={{ fontWeight: 'bold', color: '#4a90e2' }}>{value}</span>
    </div>
  );
}


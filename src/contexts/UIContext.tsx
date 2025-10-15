import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
  showButtons: boolean;
  setShowButtons: (show: boolean) => void;
  toggleButtons: () => void;
  backgroundImage: string | null;
  setBackgroundImage: (image: string | null) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

interface UIProviderProps {
  children: ReactNode;
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  const [showButtons, setShowButtons] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState<string | null>('/backgrounds/interior.png');

  const toggleButtons = () => {
    setShowButtons((prev) => !prev);
  };

  const value = {
    showButtons,
    setShowButtons,
    toggleButtons,
    backgroundImage,
    setBackgroundImage
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

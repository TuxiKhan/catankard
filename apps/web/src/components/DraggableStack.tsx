import React from 'react';
import { CardStack, type CardStackProps } from './CardStack.tsx';

export interface DraggableStackProps extends CardStackProps {}

/**
 * Masa üzerinde serbestçe sürüklenebilen CardStack sarmalayıcısı.
 */
export const DraggableStack: React.FC<DraggableStackProps> = (props) => {
  return <CardStack isDraggable {...props} />;
};

export default DraggableStack;

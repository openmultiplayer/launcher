import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";

interface DraggableItemResult {
  attributes: Record<string, any>;
  listeners: Record<string, any> | undefined;
  setNodeRef: (node: HTMLElement | null) => void;
  isDragging: boolean;
  style: {
    transform: string | undefined;
    transition: string | undefined;
  };
}

export const useDraggableItem = (
  id: string,
  isDraggable: boolean = true
): DraggableItemResult => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isDraggable,
    animateLayoutChanges: () => false,
  });

  const result = useMemo(
    () => ({
      attributes: isDraggable ? attributes : {},
      listeners: isDraggable ? listeners : undefined,
      setNodeRef,
      isDragging,
      style: {
        transform: CSS.Transform.toString(transform),
        transition,
      },
    }),
    [
      attributes,
      listeners,
      setNodeRef,
      isDragging,
      transform,
      transition,
      isDraggable,
    ]
  );

  return result;
};

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const useDraggableItem = (id: string, isDraggable: boolean) => {
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

  return {
    attributes: isDraggable ? attributes : {},
    listeners: isDraggable ? listeners : {},
    setNodeRef,
    isDragging,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
    },
  };
};

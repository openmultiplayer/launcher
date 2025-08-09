import { useEffect, useMemo, useState } from "react";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';

import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { useQuery } from "../../../../hooks/query";
import { useGenericTempState } from "../../../../states/genericStates";
import { usePersistentServers, useServers } from "../../../../states/servers";
import { sortAndSearchInServerList } from "../../../../utils/helpers";
import { Server } from "../../../../utils/types";
import List from "../List";
import ServerItem from "./../Item";

const Favorites = () => {
  const { startQuery, stopQuery } = useQuery();
  const { favorites, updateInFavoritesList, reorderFavorites } = usePersistentServers();
  const { selected, setSelected } = useServers();
  const { searchData } = useGenericTempState();

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopQuery();
      setSelected(undefined);
    };
  }, []);

  useEffect(() => {
    if (selected) {
      updateInFavoritesList(selected);
    }
  }, [selected]);

  const list = useMemo(() => {
    return sortAndSearchInServerList(favorites, searchData);
  }, [
    searchData.query,
    searchData.ompOnly,
    searchData.nonEmpty,
    searchData.unpassworded,
    searchData.sortPing,
    searchData.sortPlayer,
    searchData.sortName,
    searchData.sortMode,
    searchData.languages,
    favorites,
  ]);

  const isDraggable = useMemo(() => {
    return searchData.query === "" &&
      searchData.languages.length === 0 &&
      !searchData.ompOnly &&
      !searchData.nonEmpty &&
      !searchData.unpassworded &&
      searchData.sortPing === "none" &&
      searchData.sortPlayer === "none" &&
      searchData.sortName === "none" &&
      searchData.sortMode === "none";
  }, [searchData]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onSelect = (server: Server) => {
    stopQuery();
    setSelected(server);
    startQuery(server, "favorites");
  };

  function handleDragStart(event: any) {
    const { active } = event;
    setActiveId(active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = list.findIndex((server) => `${server.ip}:${server.port}` === active.id);
      const newIndex = list.findIndex((server) => `${server.ip}:${server.port}` === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const draggedServer = list[oldIndex];
        const targetServer = list[newIndex];

        const originalDraggedIndex = favorites.findIndex(
          (fav) => fav.ip === draggedServer.ip && fav.port === draggedServer.port
        );
        const originalTargetIndex = favorites.findIndex(
          (fav) => fav.ip === targetServer.ip && fav.port === targetServer.port
        );

        if (originalDraggedIndex !== -1 && originalTargetIndex !== -1) {
          reorderFavorites(originalDraggedIndex, originalTargetIndex);
        }
      }
    }

    setActiveId(null);
  }

  const serverIds = list.map(server => `${server.ip}:${server.port}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[
        (args) => ({
          ...args.transform,
          x: 0,
        })
      ]}
    >
      <SortableContext
        items={serverIds}
        strategy={verticalListSortingStrategy}
        disabled={!isDraggable}
      >
        <List
          data={list}
          renderItem={(item, index) => (
            <ServerItem
              key={`${item.ip}:${item.port}`}
              isSelected={
                selected
                  ? selected.ip === item.ip && selected.port === item.port
                  : false
              }
              server={item}
              index={index}
              onSelect={(server) => onSelect(server)}
              isDraggable={isDraggable}
              isBeingDragged={activeId === `${item.ip}:${item.port}`}
            />
          )}
        />
      </SortableContext>
    </DndContext>
  );
};

export default Favorites;

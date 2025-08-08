import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery } from "../../../../hooks/query";
import { useGenericTempState } from "../../../../states/genericStates";
import { usePersistentServers, useServers } from "../../../../states/servers";
import { sortAndSearchInServerList } from "../../../../utils/helpers";
import { Server } from "../../../../utils/types";
import List from "../List";
import ServerItem from "./../Item";
import { sc } from "../../../../utils/sizeScaler";

const Favorites = () => {
  const { startQuery, stopQuery } = useQuery();
  const { favorites, updateInFavoritesList, reorderFavorites } = usePersistentServers();
  const { selected, setSelected } = useServers();
  const { searchData } = useGenericTempState();
  
  // Drag functionality state
  const [draggedItem, setDraggedItem] = useState<{server: Server, index: number} | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const itemHeight = sc(39);
  const listRef = useRef<any>(null);

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

  const onSelect = (server: Server) => {
    stopQuery();
    setSelected(server);
    startQuery(server, "favorites");
  };

  const handleDragStart = (server: Server, index: number) => {
    setDraggedItem({ server, index });
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedItem && dragOverIndex !== null && draggedItem.index !== dragOverIndex) {
      const draggedServer = draggedItem.server;
      const targetServer = list[dragOverIndex];
      
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
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragMove = (draggedIndex: number, y: number) => {
    if (listRef.current && draggedItem) {
      const listElement = listRef.current;
      const listRect = listElement.getBoundingClientRect();
      const relativeY = y - listRect.top;
      const headerHeight = 26;
      const adjustedY = relativeY - headerHeight;
      let newHoverIndex = Math.floor(adjustedY / itemHeight);
      newHoverIndex = Math.max(0, Math.min(newHoverIndex, list.length - 1));
      
      if (newHoverIndex !== draggedIndex && newHoverIndex !== dragOverIndex) {
        setDragOverIndex(newHoverIndex);
      }
    }
  };

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

  return (
    <List
      data={list}
      listRef={listRef}
      renderItem={(item, index) => (
        <ServerItem
          isSelected={
            selected
              ? selected.ip === item.ip && selected.port === item.port
              : false
          }
          server={item}
          index={index}
          onSelect={(server) => onSelect(server)}
          isDraggable={isDraggable}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragMove={handleDragMove}
          isDraggedOver={dragOverIndex === index}
          isBeingDragged={draggedItem?.index === index}
        />
      )}
    />
  );
};

export default Favorites;

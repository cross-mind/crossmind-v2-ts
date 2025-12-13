/**
 * CanvasBackgroundContextMenu Component
 * Context menu for Canvas background (empty areas) to create nodes
 */

"use client";

import { useState, useRef, useEffect } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Plus } from "lucide-react";

interface CanvasBackgroundContextMenuProps {
  children: React.ReactNode;
  onCreateNode: (x: number, y: number) => void;
  transformRef: React.RefObject<HTMLDivElement>;
  zoom: number;
  panX: number;
  panY: number;
}

export function CanvasBackgroundContextMenu({
  children,
  onCreateNode,
  transformRef,
  zoom,
  panX,
  panY,
}: CanvasBackgroundContextMenuProps) {
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Use native event listener to capture coordinates
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleContextMenu = (e: MouseEvent) => {
      // Check if right-click is on empty area (not on a node)
      const target = e.target as HTMLElement;
      const isNodeClick = target.closest('[data-node-id]');

      console.log('[CanvasBackgroundContextMenu] Context menu event', {
        isNodeClick: !!isNodeClick,
        target: target.tagName,
        clientPos: { x: e.clientX, y: e.clientY }
      });

      if (isNodeClick) {
        // Don't capture coordinates for node clicks
        return;
      }

      // Convert screen coordinates to Canvas coordinates
      const container = transformRef.current;
      if (!container) {
        console.log('[CanvasBackgroundContextMenu] No transform container ref');
        return;
      }

      const rect = container.getBoundingClientRect();

      // Calculate Canvas coordinates
      // rect.left/top already include the transform, so we subtract them to get position within container
      // Then we need to account for the transform to get the actual Canvas position
      const canvasX = (e.clientX - rect.left) / zoom;
      const canvasY = (e.clientY - rect.top) / zoom;

      setClickPosition({ x: canvasX, y: canvasY });

      console.log('[CanvasBackgroundContextMenu] Coordinates captured', {
        screenPos: { x: e.clientX, y: e.clientY },
        canvasPos: { x: canvasX, y: canvasY }
      });
    };

    // Don't use capture phase - let the event bubble normally so Radix can handle it
    wrapper.addEventListener('contextmenu', handleContextMenu);

    return () => {
      wrapper.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [transformRef, zoom, panX, panY]);

  const handleCreateNodeClick = () => {
    console.log('[CanvasBackgroundContextMenu] Create node clicked', clickPosition);
    onCreateNode(clickPosition.x, clickPosition.y);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ContextMenu>
        <ContextMenuTrigger style={{ position: 'relative', width: '100%', height: '100%', display: 'block' }}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handleCreateNodeClick}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Create Node Here</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

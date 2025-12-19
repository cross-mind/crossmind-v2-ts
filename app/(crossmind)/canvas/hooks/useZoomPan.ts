/**
 * Zoom and Pan Hook
 * Handles canvas zoom and pan interactions with 60fps performance
 */

import { useRef, useState, useCallback, useEffect } from "react";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export function useZoomPan() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null); // Canvas container (where events are listened)
  const transformRef = useRef<HTMLDivElement>(null); // Transform container (what gets transformed)
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Use refs for current values to avoid stale closures in event handlers
  // Refs are updated directly during interactions for 60fps performance
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  // Debounce timer for syncing DOM to React state
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Sync React state from DOM (debounced for performance)
   * Only syncs after user stops interacting
   */
  const syncStateDebounced = useCallback(() => {
    // Clear existing timer
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    // Schedule sync after 100ms of no interaction
    syncTimerRef.current = setTimeout(() => {
      if (!transformRef.current) return;
      const transform = transformRef.current.style.transform;
      const match = transform.match(/translate\(([^,]+),([^)]+)\) scale\(([^)]+)\)/);
      if (match) {
        const x = Number.parseFloat(match[1]);
        const y = Number.parseFloat(match[2]);
        const s = Number.parseFloat(match[3]);
        setPan({ x, y });
        setZoom(s);
      }
    }, 100);
  }, []);

  /**
   * Apply transform directly to DOM for 60fps
   */
  const applyTransform = useCallback((newPan: { x: number; y: number }, newZoom: number) => {
    if (transformRef.current) {
      transformRef.current.style.transform = `translate(${newPan.x}px, ${newPan.y}px) scale(${newZoom})`;
    }
  }, []);

  /**
   * Handle mouse wheel - zoom with Ctrl/Cmd, pan without modifier keys
   * Uses direct DOM manipulation for 60fps performance
   */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Zoom when Ctrl/Cmd is pressed
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.01;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current + delta * ZOOM_STEP));

        // Update refs for next interaction
        zoomRef.current = newZoom;

        // Apply transform directly to DOM (no React re-render)
        applyTransform(panRef.current, newZoom);

        // Sync React state after user stops scrolling
        syncStateDebounced();
      } else {
        // Pan when no modifier keys
        e.preventDefault();
        const newPan = {
          x: panRef.current.x - e.deltaX,
          y: panRef.current.y - e.deltaY,
        };

        // Update refs for next interaction
        panRef.current = newPan;

        // Apply transform directly to DOM (no React re-render)
        applyTransform(newPan, zoomRef.current);

        // Sync React state after user stops scrolling
        syncStateDebounced();
      }
    },
    [applyTransform, syncStateDebounced]
  );

  /**
   * Handle mouse drag pan
   * Supports:
   * - Middle mouse button
   * - Left click + Cmd/Ctrl
   * - Left click on empty canvas area (not on nodes)
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Check if clicking on a node or its children
    const isNodeClick = target.closest('[data-node-id]');

    // Enable pan if:
    // 1. Middle mouse button, or
    // 2. Left click + Cmd/Ctrl, or
    // 3. Left click on empty area (not on a node)
    if (e.button === 1 || (e.button === 0 && e.metaKey) || (e.button === 0 && !isNodeClick)) {
      e.preventDefault();
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;

      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const newPan = {
        x: panRef.current.x + dx,
        y: panRef.current.y + dy,
      };

      // Update refs for next interaction
      panRef.current = newPan;

      // Apply transform directly to DOM (no React re-render)
      applyTransform(newPan, zoomRef.current);

      // Sync React state after user stops dragging
      syncStateDebounced();

      lastMousePos.current = { x: e.clientX, y: e.clientY };
    },
    [applyTransform, syncStateDebounced]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    // Final sync when drag ends
    syncStateDebounced();
  }, [syncStateDebounced]);

  /**
   * Zoom controls
   */
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(MAX_ZOOM, zoomRef.current + ZOOM_STEP);
    zoomRef.current = newZoom; // Update ref for consistency
    applyTransform(panRef.current, newZoom);
    setZoom(newZoom);
  }, [applyTransform]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(MIN_ZOOM, zoomRef.current - ZOOM_STEP);
    zoomRef.current = newZoom; // Update ref for consistency
    applyTransform(panRef.current, newZoom);
    setZoom(newZoom);
  }, [applyTransform]);

  const handleResetView = useCallback(() => {
    const newZoom = 1;
    const newPan = { x: 0, y: 0 };
    zoomRef.current = newZoom; // Update ref for consistency
    panRef.current = newPan; // Update ref for consistency
    applyTransform(newPan, newZoom);
    setZoom(newZoom);
    setPan(newPan);
  }, [applyTransform]);

  return {
    zoom,
    pan,
    containerRef,
    transformRef,
    handleMouseDown,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    // Export event handlers for CanvasArea to attach
    handleWheel,
    handleMouseMove,
    handleMouseUp,
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import planets, { mecatol } from "./planets";

// Types for Tile and Hex Coordinates
interface Hex {
  q: number; // Column coordinate
  r: number; // Row coordinate
  s: number; // Derived coordinate (-q-r)
}

interface Tile {
  hex: Hex;

  name: string;
  resources: number;
  influence: number;
}

// Utility Functions for Hex Math
function hexToPixel(hex: Hex, size: number): { x: number; y: number } {
  const x = size * (3 / 2) * hex.q;
  const y = size * Math.sqrt(3) * (hex.r + hex.q / 2);
  return { x, y };
}

function createHex(q: number, r: number): Hex {
  return { q, r, s: -q - r };
}

function generateHexGrid(radius: number): Hex[] {
  const hexes: Hex[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (
      let r = Math.max(-radius, -q - radius);
      r <= Math.min(radius, -q + radius);
      r++
    ) {
      hexes.push(createHex(q, r));
    }
  }
  return hexes;
}

// Drawing Functions
function drawHex(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
): void {
  const angles = Array.from({ length: 6 }, (_, i) => (Math.PI / 3) * i);
  ctx.beginPath();
  for (const angle of angles) {
    const x = centerX + size * Math.cos(angle);
    const y = centerY + size * Math.sin(angle);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = `#091d66`,
  ctx.fill();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function renderGrid(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[],
  size: number,
  canvas: { width: number; height: number },
  offset: { x: number; y: number },
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const tile of tiles) {
    const { x, y } = hexToPixel(tile.hex, size);
    const centerX = x + canvas.width / 2 + offset.x;
    const centerY = y + canvas.height / 2 + offset.y;

    drawHex(ctx, centerX, centerY, size);

    if (tile.name) {
      ctx.fillStyle = "white";
      ctx.font = `${size / 6}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tile.name, centerX, centerY + (size / 2 + size / 7.5));
      ctx.fillText(
        String(tile.resources),
        centerX - 35,
        centerY + (size / 3 + 10) - 10,
      );
      ctx.fillText(String(tile.influence), centerX - 30, centerY + (size / 3 + 10));
    }
  }
}

function HexGrid({
  hexSize = 75, // Adjust the size of each hexagon
  tiles,

  zoomSpeed = 1,
  panSpeed = 2,
}: {
  hexSize?: number;
  tiles: Tile[];

  zoomSpeed?: number;
  panSpeed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const offset = useRef({ x: 0, y: 0 });
  const zoom = useRef(1);
  const frameRef = useRef<number>(0);
  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const render = () => {
      const windowSize = { width: window.innerWidth, height: window.innerHeight }
      setCanvasSize(windowSize);
      renderGrid(ctx, tiles, hexSize * zoom.current, windowSize, offset.current);
      frameRef.current = requestAnimationFrame(render);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = (event.deltaY < 0 ? 0.1 : -0.1) * zoomSpeed;
      zoom.current = Math.min(Math.max(zoom.current + delta, 0.5), 2);
    };

    const handleMouseDown = (event: MouseEvent) => {
      isDragging.current = true;
      lastMousePosition.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = (event.clientX - lastMousePosition.current.x) * panSpeed;
      const dy = (event.clientY - lastMousePosition.current.y) * panSpeed;
      offset.current = { x: offset.current.x + dx, y: offset.current.y + dy };
      lastMousePosition.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    canvas.addEventListener("wheel", handleWheel);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);

    frameRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [tiles, hexSize, panSpeed, zoomSpeed]);

  return (
    <canvas
      style={{ fontSmooth: "never", WebkitFontSmoothing: "none" }}
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
    />
  );
}

function shuffle<T>(array: T[]): T[] {
  let copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy
}

export default function Home() {
  const hexes = generateHexGrid(3);
  let planetDeck = shuffle(planets);

  const tiles: Tile[] = hexes.map((hex) => {
		  if (hex.q === 0 && hex.r === 0) {
        return { ...mecatol, hex };
		  }
		  const planet = planetDeck.splice(
				  Math.floor(Math.random() * planetDeck.length),
				  1,
				  )[0];
		  return { ...planet, hex };
  });
  return <HexGrid tiles={tiles} />;
}

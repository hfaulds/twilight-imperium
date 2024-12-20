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
  color: string; // Color of the tile

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
  color: string,
): void {
  const angles = Array.from({ length: 6 }, (_, i) => (Math.PI / 3) * i);
  ctx.beginPath();
  for (const angle of angles) {
    const x = centerX + size * Math.cos(angle);
    const y = centerY + size * Math.sin(angle);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
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

    drawHex(ctx, centerX, centerY, size, tile.color);

    if (tile.name) {
      ctx.fillStyle = "white";
      ctx.font = `${size / 6}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tile.name, centerX, centerY + (size / 2 + size / 7.5));
      ctx.fillText(
        tile.resources,
        centerX - 35,
        centerY + (size / 3 + 10) - 10,
      );
      ctx.fillText(tile.influence, centerX - 30, centerY + (size / 3 + 10));
    }
  }
}

function HexGrid({
  hexSize = 75, // Adjust the size of each hexagon
  tiles,

  zoomSpeed = 1,
  panSpeed = 2,
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const resizeWindow = () => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  };

  useEffect(() => {
    window.addEventListener("resize", resizeWindow);
    return () => window.removeEventListener("resize", resizeWindow);
  }, []);

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const delta = (event.deltaY < 0 ? 0.1 : -0.1) * zoomSpeed;
    setZoom((prevZoom) => Math.min(Math.max(prevZoom + delta, 0.5), 2));
  };

  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });

  const handleMouseDown = (event: MouseEvent) => {
    isDragging.current = true;
    lastMousePosition.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = (event.clientX - lastMousePosition.current.x) * panSpeed;
    const dy = (event.clientY - lastMousePosition.current.y) * panSpeed;
    setOffset((prevOffset) => ({ x: prevOffset.x + dx, y: prevOffset.y + dy }));
    lastMousePosition.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const render = () => {
      renderGrid(ctx, tiles, hexSize * zoom, windowSize, offset);
      requestAnimationFrame(render);
    };

    canvas.addEventListener("wheel", handleWheel);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);

    requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(render);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [hexSize, tiles, zoom, offset]);

  return (
    <canvas
      style={{ fontSmooth: "never", WebkitFontSmoothing: "none" }}
      ref={canvasRef}
      width={windowSize.width}
      height={windowSize.height}
    />
  );
}

export default function Home() {
  const hexes = generateHexGrid(3);
  let planetDeck = planets.slice();

  const tiles: Tile[] = hexes.map((hex) => {
    var planet = undefined;
    if (hex.q === 0 && hex.r === 0) {
      planet = mecatol;
    } else {
      planet = planetDeck.splice(
        Math.floor(Math.random() * planetDeck.length),
        1,
      )[0];
    }

    return {
      ...planet,
      hex,
      color: `#091d66`,
    };
  });
  return <HexGrid tiles={tiles} />;
}

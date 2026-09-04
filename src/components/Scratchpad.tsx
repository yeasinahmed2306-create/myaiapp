import React, { useRef, useState, useEffect } from "react";
import { Undo, Eraser, Edit2, Grid, Trash2, X, Maximize2, Minimize2 } from "lucide-react";

interface ScratchpadProps {
  onClose: () => void;
}

export default function Scratchpad({ onClose }: ScratchpadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#0f172a"); // default charcoal slate-900
  const [lineWidth, setLineWidth] = useState(3);
  const [showGrid, setShowGrid] = useState(true);
  const [isLarge, setIsLarge] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Initialize canvas with correct pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get parent dimensions
    const rect = canvas.parentElement?.getBoundingClientRect();
    const width = rect?.width || 500;
    const height = rect?.height || 450;

    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    contextRef.current = context;

    // Fill white canvas background
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    // Save initial blank state
    saveState();

    // Resize listener
    const handleResize = () => {
      const parentRect = canvas.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      // Backup canvas content
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      // Resize
      const w = parentRect.width;
      const h = parentRect.height;
      canvas.width = w * 2;
      canvas.height = h * 2;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      context.scale(2, 2);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = color;
      context.lineWidth = lineWidth;

      // Restore
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, w, h);
      context.drawImage(tempCanvas, 0, 0, canvas.width / 2, canvas.height / 2);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isLarge]);

  // Update canvas strokes settings when color or width changes
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = lineWidth;
    }
  }, [color, lineWidth]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory((prev) => [...prev, canvas.toDataURL()]);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      // Prevent scrolling on touch devices while drawing
      if (e.cancelable) e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    contextRef.current?.closePath();
    setIsDrawing(false);
    saveState();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const width = canvas.width / 2;
    const height = canvas.height / 2;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    saveState();
  };

  const undo = () => {
    if (history.length <= 1) return;

    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const prevStateData = newHistory[newHistory.length - 1];
    setHistory(newHistory);

    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context || !prevStateData) return;

    const img = new Image();
    img.src = prevStateData;
    img.onload = () => {
      const width = canvas.width / 2;
      const height = canvas.height / 2;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(img, 0, 0, width, height);
    };
  };

  return (
    <div
      className={`flex flex-col bg-slate-50 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ${
        isLarge ? "h-[650px] w-full" : "h-[500px] w-full"
      }`}
    >
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-800">Scribble Scratchpad</h3>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">| Practice steps here</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg transition-colors ${
              showGrid ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:bg-slate-50"
            }`}
            title="Toggle Grid Paper"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setIsLarge(!isLarge)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            title={isLarge ? "Reduce Size" : "Expand Scratchpad"}
          >
            {isLarge ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Close Scratchpad"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50/80 border-b border-slate-100">
        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {[
            { value: "#0f172a", label: "Slate" },
            { value: "#2563eb", label: "Blue" },
            { value: "#dc2626", label: "Red" },
            { value: "#16a34a", label: "Green" },
          ].map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full border transition-transform ${
                color === c.value ? "scale-110 border-slate-800 ring-2 ring-offset-1 ring-slate-400" : "border-transparent"
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
          <button
            onClick={() => setColor("#ffffff")}
            className={`p-1 rounded-lg border transition-colors ${
              color === "#ffffff" ? "bg-slate-200 border-slate-400 text-slate-800" : "border-transparent text-slate-400 hover:bg-slate-100"
            }`}
            title="Eraser tool"
          >
            <Eraser size={16} />
          </button>
        </div>

        {/* Brush Sizes */}
        <div className="flex items-center gap-1 bg-white border border-slate-200/50 rounded-lg p-0.5">
          {[2, 4, 8].map((size) => (
            <button
              key={size}
              onClick={() => setLineWidth(size)}
              className={`px-2 py-1 text-xs rounded-md font-mono transition-colors ${
                lineWidth === size ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {size === 2 ? "Thin" : size === 4 ? "Mid" : "Thick"}
            </button>
          ))}
        </div>

        {/* Edit controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={history.length <= 1}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200/50 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-transparent transition-all"
            title="Undo stroke"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={clearCanvas}
            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all"
            title="Clear Scratchpad"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div className="flex-1 relative bg-white overflow-hidden min-h-[250px]">
        {/* Toggleable grid overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
}

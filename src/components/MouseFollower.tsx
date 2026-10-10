import React, { useEffect, useRef, useState } from "react";

interface MouseEventData {
  type: string;
  x: number;
  y: number;
  button: string | null;
  wheelDelta: number | null;
}

interface MousePosition {
  x: number;
  y: number;
}

interface Trail {
  id: number;
  x: number;
  y: number;
}

const MouseFollower: React.FC = () => {
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [isClicked, setIsClicked] = useState<boolean>(false);
  const [trails, setTrails] = useState<Trail[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const getButtonName = (button: number): string => {
    switch (button) {
      case 0:
        return "left";
      case 1:
        return "middle";
      case 2:
        return "right";
      default:
        return "unknown";
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setMousePos({ x, y });

        // Create trail effect
        const trailId = Date.now() + Math.random();
        setTrails((prev) => [...prev, { id: trailId, x, y }]);

        // Remove trail after animation
        setTimeout(() => {
          setTrails((prev) => prev.filter((trail) => trail.id !== trailId));
        }, 1000);
      }
    };

    const handleMouseDown = (e: MouseEvent): void => {
      setIsClicked(true);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseEventData: MouseEventData = {
          type: "mousedown",
          x: Math.round(e.clientX - rect.left),
          y: Math.round(e.clientY - rect.top),
          button: getButtonName(e.button),
          wheelDelta: null,
        };

        console.log("Click event:", mouseEventData);
      }
    };

    const handleMouseUp = (): void => {
      setIsClicked(false);
    };

    const handleWheel = (e: WheelEvent): void => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseEventData: MouseEventData = {
          type: "wheel",
          x: Math.round(e.clientX - rect.left),
          y: Math.round(e.clientY - rect.top),
          button: null,
          wheelDelta: e.deltaY,
        };

        console.log("Wheel event:", mouseEventData);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mousedown", handleMouseDown);
      container.addEventListener("mouseup", handleMouseUp);
      container.addEventListener("wheel", handleWheel);
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mousedown", handleMouseDown);
        container.removeEventListener("mouseup", handleMouseUp);
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    // background: "linear-gradient(135deg, #1e3c72, #2a5298)",
    overflow: "hidden",
    cursor: "none",
  };

  const circleStyle: React.CSSProperties = {
    position: "absolute",
    width: "50px",
    height: "50px",
    background: "radial-gradient(circle, #ff4444, #cc0000)",
    borderRadius: "50%",
    transform: `translate(-50%, -50%) ${isClicked ? "scale(0.8)" : "scale(1)"}`,
    transition: "transform 0.1s ease-out",
    boxShadow: isClicked
      ? "0 0 30px rgba(255, 68, 68, 0.8)"
      : "0 0 20px rgba(255, 68, 68, 0.5)",
    left: `${mousePos.x}px`,
    top: `${mousePos.y}px`,
  };

  const infoStyle: React.CSSProperties = {
    position: "absolute",
    top: "16px",
    left: "16px",
    color: "white",
    fontFamily: "monospace",
    fontSize: "14px",
    background: "rgba(0, 0, 0, 0.3)",
    padding: "8px 12px",
    borderRadius: "4px",
  };

  const trailStyle = (trail: Trail): React.CSSProperties => ({
    position: "absolute",
    width: "12px",
    height: "12px",
    background: "rgba(255, 68, 68, 0.4)",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
    left: `${trail.x}px`,
    top: `${trail.y}px`,
    pointerEvents: "none",
    animation: "fadeOut 1s ease-out forwards",
  });

  // Add CSS animation keyframes
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeOut {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div ref={containerRef} style={containerStyle}>
      {/* Red circle that follows mouse */}
      <div style={circleStyle} />

      {/* Trail effects */}
      {trails.map((trail: Trail) => (
        <div key={trail.id} style={trailStyle(trail)} />
      ))}

      {/* Info display */}
      <div style={infoStyle}>
        <div>
          Position: {Math.round(mousePos.x)}, {Math.round(mousePos.y)}
        </div>
        <div style={{ fontSize: "12px", color: "#ccc", marginTop: "4px" }}>
          Move mouse • Click • Scroll
        </div>
      </div>
    </div>
  );
};

export default MouseFollower;

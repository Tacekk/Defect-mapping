import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Group } from 'react-konva';
import type Konva from 'konva';
import type { Product, DefectType, DefectMarker, Position } from '@glass-inspector/shared';

interface DefectCanvasProps {
  product: Product;
  defects: DefectMarker[];
  defectTypes: DefectType[];
  onDefectAdd: (position: Position) => void;
  onDefectClick: (defect: DefectMarker) => void;
  readonly?: boolean;
}

export function DefectCanvas({
  product,
  defects,
  defectTypes,
  onDefectAdd,
  onDefectClick,
  readonly = false,
}: DefectCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Load template image
  useEffect(() => {
    if (product.templateImage) {
      const img = new window.Image();
      img.src = product.templateImage;
      img.onload = () => {
        setImage(img);
      };
    }
  }, [product.templateImage]);

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: Math.max(height, 400) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate image scale and position to fit container
  const getImageDimensions = useCallback(() => {
    if (!image) return { width: dimensions.width, height: dimensions.height, x: 0, y: 0 };

    const containerAspect = dimensions.width / dimensions.height;
    const imageAspect = image.width / image.height;

    let width: number;
    let height: number;

    if (containerAspect > imageAspect) {
      height = dimensions.height;
      width = height * imageAspect;
    } else {
      width = dimensions.width;
      height = width / imageAspect;
    }

    const x = (dimensions.width - width) / 2;
    const y = (dimensions.height - height) / 2;

    return { width, height, x, y };
  }, [image, dimensions]);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (readonly) return;

    const stage = e.target.getStage();
    if (!stage) return;

    // Check if clicking on a defect marker
    const clickedOnDefect = e.target.getClassName() === 'Circle';
    if (clickedOnDefect) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const imageDims = getImageDimensions();

    // Convert to relative position (0-1)
    const relX = (pointer.x - imageDims.x) / imageDims.width;
    const relY = (pointer.y - imageDims.y) / imageDims.height;

    // Only add defect if click is within the image bounds
    if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
      onDefectAdd({ x: relX, y: relY });
    }
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit scale
    const limitedScale = Math.max(0.5, Math.min(3, newScale));

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    setScale(limitedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * limitedScale,
      y: pointer.y - mousePointTo.y * limitedScale,
    });
  };

  const imageDims = getImageDimensions();

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] bg-muted rounded-lg overflow-hidden touch-none"
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={scale > 1}
        onDragEnd={(e) => {
          setPosition({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
      >
        <Layer>
          {/* Template Image or Placeholder */}
          {image ? (
            <KonvaImage
              image={image}
              x={imageDims.x}
              y={imageDims.y}
              width={imageDims.width}
              height={imageDims.height}
            />
          ) : (
            <Group>
              {/* Placeholder rectangle when no image */}
              <Konva.Rect
                x={imageDims.x}
                y={imageDims.y}
                width={imageDims.width}
                height={imageDims.height}
                fill="#374151"
                stroke="#6B7280"
                strokeWidth={2}
              />
            </Group>
          )}

          {/* Defect Markers */}
          {defects.map((defect) => {
            const x = imageDims.x + defect.x * imageDims.width;
            const y = imageDims.y + defect.y * imageDims.height;
            const markerSize = 12 / scale;

            return (
              <Group key={defect.id}>
                <Circle
                  x={x}
                  y={y}
                  radius={markerSize}
                  fill={defect.color}
                  stroke="#ffffff"
                  strokeWidth={2 / scale}
                  shadowColor="black"
                  shadowBlur={4 / scale}
                  shadowOpacity={0.5}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onDefectClick(defect);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    onDefectClick(defect);
                  }}
                />
                <Circle
                  x={x}
                  y={y}
                  radius={markerSize * 0.4}
                  fill="#ffffff"
                  listening={false}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          className="w-10 h-10 bg-background border rounded-md flex items-center justify-center hover:bg-accent"
          onClick={() => setScale(Math.min(3, scale * 1.2))}
        >
          +
        </button>
        <button
          className="w-10 h-10 bg-background border rounded-md flex items-center justify-center hover:bg-accent"
          onClick={() => setScale(Math.max(0.5, scale / 1.2))}
        >
          -
        </button>
        <button
          className="w-10 h-10 bg-background border rounded-md flex items-center justify-center hover:bg-accent text-xs"
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }}
        >
          1:1
        </button>
      </div>
    </div>
  );
}

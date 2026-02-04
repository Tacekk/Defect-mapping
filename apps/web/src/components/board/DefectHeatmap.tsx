import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HeatmapResponse, DefectType } from '@glass-inspector/shared';

interface DefectHeatmapProps {
  data: HeatmapResponse | null;
  defectTypes: DefectType[];
  isLoading: boolean;
}

export function DefectHeatmap({ data, defectTypes, isLoading }: DefectHeatmapProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        const aspectRatio = data ? data.templateWidth / data.templateHeight : 4 / 3;
        setDimensions({ width, height: width / aspectRatio });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.dataPoints.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const point of data.dataPoints) {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      const radius = Math.max(15, 30 * point.intensity);
      const defectType = defectTypes.find((dt) => dt.id === point.defectTypeId);
      const color = defectType?.color || '#EF4444';
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const alpha = 0.3 + point.intensity * 0.5;
      gradient.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, color + '00');
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [data, defectTypes, dimensions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!data || data.dataPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full rounded-lg bg-muted"
      />
      <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs">
        {data.totalDefects} defects
      </div>
    </div>
  );
}

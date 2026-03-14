import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Download, Check } from "lucide-react";
import { toast } from "sonner";

mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  fontFamily: "Inter, sans-serif",
  themeVariables: {
    primaryColor: "#3b82f6",
    primaryTextColor: "#1e293b",
    primaryBorderColor: "#3b82f6",
    lineColor: "#64748b",
    secondaryColor: "#f1f5f9",
    tertiaryColor: "#f8fafc",
  }
});

let idCounter = 0;

export default function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const idRef = useRef(`mermaid-${++idCounter}-${Date.now()}`);

  useEffect(() => {
    if (!chart.trim()) return;

    const render = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(idRef.current, chart);
        setSvg(renderedSvg);
        setError(null);
      } catch (e: any) {
        setError(e.message || "Failed to render diagram");
        const errorEl = document.getElementById("d" + idRef.current);
        if (errorEl) errorEl.remove();
      }
    };

    render();
  }, [chart]);

  const downloadAsImage = async () => {
    if (!containerRef.current) return;
    setIsDownloading(true);
    
    try {
      const svgElement = containerRef.current.querySelector("svg");
      if (!svgElement) throw new Error("SVG not found");

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      const svgSize = svgElement.getBoundingClientRect();
      const scale = 2; // Higher resolution
      canvas.width = svgSize.width * scale;
      canvas.height = svgSize.height * scale;

      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const pngUrl = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = pngUrl;
          downloadLink.download = `diagram-${Date.now()}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          URL.revokeObjectURL(url);
          toast.success("Diagram downloaded as PNG");
          setIsDownloading(false);
        }
      };
      img.src = url;
    } catch (err) {
      console.error("Error downloading diagram:", err);
      toast.error("Failed to download diagram");
      setIsDownloading(false);
    }
  };

  if (error) {
    return (
      <div className="bg-secondary/50 rounded-xl p-4 border border-border">
        <p className="text-xs text-muted-foreground mb-2">Diagram (raw Mermaid syntax):</p>
        <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap text-foreground/80">{chart}</pre>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        ref={containerRef}
        className="bg-white rounded-xl p-6 border border-border overflow-x-auto flex justify-center shadow-sm"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {svg && (
        <button
          onClick={downloadAsImage}
          disabled={isDownloading}
          className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm border border-border rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white text-muted-foreground flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
          title="Download as PNG"
        >
          {isDownloading ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
          {isDownloading ? "Saved" : "Save Image"}
        </button>
      )}
    </div>
  );
}

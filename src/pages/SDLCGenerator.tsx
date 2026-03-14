import { useState, useRef, useCallback, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Palette, Code2, TestTube2, Cloud, Wrench,
  Play, Loader2, CheckCircle2, ChevronDown, ChevronUp,
  Sparkles, RotateCcw, Copy, Check, Download, Save, FileDown,
  Upload, X, ThumbsUp, ThumbsDown, RefreshCw, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MermaidDiagram from "@/components/MermaidDiagram";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface PhaseConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  fileExt: string;
  fileName: string;
}

const PHASES: PhaseConfig[] = [
  { id: "requirements", label: "Requirements Analysis", icon: FileText, description: "Extract functional & non-functional requirements, use cases, and acceptance criteria", fileExt: "pdf", fileName: "requirements-specification" },
  { id: "design", label: "System Design", icon: Palette, description: "Architecture diagrams, ER diagrams, class diagrams, and API design", fileExt: "pdf", fileName: "system-design" },
  { id: "implementation", label: "Code Generation", icon: Code2, description: "Project structure, database schema, API code, and frontend components", fileExt: "pdf", fileName: "implementation-code" },
  { id: "testing", label: "Testing & QA", icon: TestTube2, description: "Test strategy, unit tests, integration tests, and defect prediction", fileExt: "pdf", fileName: "testing-strategy" },
  { id: "deployment", label: "Cloud Deployment", icon: Cloud, description: "CI/CD pipeline, Docker config, cloud infrastructure, and monitoring", fileExt: "pdf", fileName: "deployment-plan" },
  { id: "maintenance", label: "Maintenance & Defect Detection", icon: Wrench, description: "Defect detection, monitoring, SLA definitions, and maintenance strategy", fileExt: "pdf", fileName: "maintenance-plan" },
];

const PHASE_COLORS: Record<string, string> = {
  requirements: "from-blue-500/20 to-blue-600/5 border-blue-500/20",
  design: "from-violet-500/20 to-violet-600/5 border-violet-500/20",
  implementation: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
  testing: "from-amber-500/20 to-amber-600/5 border-amber-500/20",
  deployment: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20",
  maintenance: "from-rose-500/20 to-rose-600/5 border-rose-500/20",
};

const PHASE_ICON_COLORS: Record<string, string> = {
  requirements: "bg-blue-500/15 text-blue-400",
  design: "bg-violet-500/15 text-violet-400",
  implementation: "bg-emerald-500/15 text-emerald-400",
  testing: "bg-amber-500/15 text-amber-400",
  deployment: "bg-cyan-500/15 text-cyan-400",
  maintenance: "bg-rose-500/15 text-rose-400",
};

// ========== Streaming Logic ==========
async function streamPhase(
  projectDescription: string,
  phase: string,
  previousContent: string,
  uploadedDocs: string,
  feedback: string,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  signal?: AbortSignal,
) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-sdlc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        projectDescription,
        phase,
        previousPhaseContent: previousContent || undefined,
        uploadedDocuments: uploadedDocs || undefined,
        feedbackContext: feedback || undefined,
      }),
      signal,
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({ error: "Request failed" }));
      onError(errData.error || `Error ${resp.status}`);
      return;
    }


    if (!resp.body) { onError("No response body"); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e: any) {
    if (e.name !== "AbortError") {
      onError(e.message || "Unknown error");
    }
  }
}

// ========== Sub-components ==========
function MarkdownRenderer({ content }: { content: string }) {
  const segments: { type: "text" | "mermaid"; content: string }[] = [];
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = mermaidRegex.exec(content)) !== null) {
    if (match.index > lastIndex) segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    segments.push({ type: "mermaid", content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) segments.push({ type: "text", content: content.slice(lastIndex) });
  return (
    <div className="space-y-4">
      {segments.map((seg, i) =>
        seg.type === "mermaid" ? (
          <MermaidDiagram key={i} chart={seg.content} />
        ) : (
          <div key={i} className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-pre:bg-sidebar prose-pre:text-sidebar-foreground prose-pre:rounded-xl prose-pre:border prose-pre:border-border" dangerouslySetInnerHTML={{ __html: simpleMarkdown(seg.content) }} />
        )
      )}
    </div>
  );
}

function simpleMarkdown(md: string): string {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[\s-:]+$/.test(c))) return '';
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
    })
    .replace(/^---$/gm, '<hr/>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table class="w-full text-sm border border-border rounded">$1</table>');
  html = html.replace(/<\/table>\s*<table[^>]*>/g, '');
  return `<p>${html}</p>`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Copied!"); }} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Copy">
      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

async function downloadElementAsPDF(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    toast.error("Could not find element to export");
    return;
  }

  try {
    toast.loading("Preparing PDF...", { id: "pdf-gen" });
    
    // Create a temporary container to style for PDF
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.maxHeight = "none";
          clonedElement.style.height = "auto";
          clonedElement.style.overflow = "visible";
          clonedElement.style.color = "#000000";
          clonedElement.style.padding = "20px";
          // Ensure mermaid SVGs are visible
          const svgs = clonedElement.querySelectorAll("svg");
          svgs.forEach(svg => {
            svg.style.maxWidth = "100%";
            svg.style.height = "auto";
          });
        }
      }
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
    toast.success(`Downloaded ${fileName}`, { id: "pdf-gen" });
  } catch (err) {
    console.error("PDF generation error:", err);
    toast.error("Failed to generate PDF", { id: "pdf-gen" });
  }
}

function downloadAsPDF(content: string, fileName: string) {
  const doc = new jsPDF();
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;
  
  const cleanContent = content
    .replace(/```mermaid[\s\S]*?```/g, "[Mermaid Diagram]")
    .replace(/```(\w*)/g, "")
    .replace(/```/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "");

  const splitText = doc.splitTextToSize(cleanContent, maxLineWidth);
  let cursorY = 20;

  doc.setFontSize(16);
  doc.text(fileName.replace(/-/g, ' ').toUpperCase(), margin, cursorY);
  cursorY += 10;
  doc.setFontSize(10);

  for (let i = 0; i < splitText.length; i++) {
    if (cursorY > pageHeight - margin) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(splitText[i], margin, cursorY);
    cursorY += 6;
  }

  doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}

// ========== Evaluation Metrics ==========
function EvaluationMetrics({ phaseResults }: { phaseResults: Record<string, string> }) {
  const completedPhases = Object.keys(phaseResults).length;
  if (completedPhases === 0) return null;

  // Simulate evaluation based on content analysis
  const metrics = {
    completeness: Math.min(100, (completedPhases / 6) * 100),
    codeBlocks: Object.values(phaseResults).join("").split("```").length - 1,
    diagrams: Object.values(phaseResults).join("").split("```mermaid").length - 1,
    requirements: (phaseResults.requirements?.match(/FR-\d+/g) || []).length,
    testCases: (phaseResults.testing?.match(/test|it\(|describe\(/gi) || []).length,
    totalWords: Object.values(phaseResults).join(" ").split(/\s+/).length,
  };

  const overallScore = Math.round(
    (metrics.completeness * 0.3) +
    (Math.min(metrics.codeBlocks, 20) / 20 * 100 * 0.25) +
    (Math.min(metrics.diagrams, 8) / 8 * 100 * 0.2) +
    (Math.min(metrics.requirements, 10) / 10 * 100 * 0.15) +
    (Math.min(metrics.testCases, 15) / 15 * 100 * 0.1)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-heading font-bold text-sm">Evaluation & SDLC Output Metrics</h3>
      </div>
      
      {/* Overall Score */}
      <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeDasharray={`${overallScore * 1.76} 176`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold font-mono">{overallScore}%</span>
        </div>
        <div>
          <p className="text-sm font-semibold">Overall Quality Score</p>
          <p className="text-xs text-muted-foreground">Based on completeness, code coverage, diagrams, and test cases</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Phases Complete", value: `${completedPhases}/6`, color: "text-primary" },
          { label: "Code Blocks", value: metrics.codeBlocks, color: "text-emerald-500" },
          { label: "Diagrams Generated", value: metrics.diagrams, color: "text-violet-500" },
          { label: "Requirements (FR)", value: metrics.requirements, color: "text-blue-500" },
          { label: "Test References", value: metrics.testCases, color: "text-amber-500" },
          { label: "Total Words", value: metrics.totalWords.toLocaleString(), color: "text-cyan-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-secondary/30 rounded-xl p-3 text-center">
            <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ========== Feedback Component ==========
function PhaseFeedback({ phaseId, onRefine }: { phaseId: string; onRefine: (feedback: string) => void }) {
  const [rating, setRating] = useState<"good" | "bad" | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showInput, setShowInput] = useState(false);

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Rate this output:</span>
        <button
          onClick={() => { setRating("good"); toast.success("Thanks for the feedback!"); }}
          className={`p-1.5 rounded-md transition-colors ${rating === "good" ? "bg-success/20 text-success" : "hover:bg-secondary text-muted-foreground"}`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { setRating("bad"); setShowInput(true); }}
          className={`p-1.5 rounded-md transition-colors ${rating === "bad" ? "bg-destructive/20 text-destructive" : "hover:bg-secondary text-muted-foreground"}`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
        {!showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refine with feedback
          </button>
        )}
      </div>
      {showInput && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 flex gap-2">
          <input
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder="What should be improved? e.g. 'Add more API endpoints' or 'Include error handling'"
            className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <Button
            size="sm"
            onClick={() => { if (feedbackText.trim()) { onRefine(feedbackText); setShowInput(false); setFeedbackText(""); } }}
            disabled={!feedbackText.trim()}
          >
            <RefreshCw className="w-3 h-3" /> Regenerate
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ========== Main Component ==========
export default function SDLCGenerator() {
  const [projectDesc, setProjectDesc] = useState("");
  const [srsContent, setSrsContent] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; content: string }[]>([]);
  const [phaseResults, setPhaseResults] = useState<Record<string, string>>({});
  const [phaseFeedback, setPhaseFeedback] = useState<Record<string, string>>({});
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project from history
  useEffect(() => {
    const saved = sessionStorage.getItem("sdlc_load_project");
    if (saved) {
      try {
        const project = JSON.parse(saved);
        setProjectDesc(project.description || "");
        setPhaseResults(project.phases || {});
        setExpandedPhases(new Set(Object.keys(project.phases || {})));
        toast.success(`Loaded: ${project.name}`);
      } catch { /* ignore */ }
      sessionStorage.removeItem("sdlc_load_project");
    }
  }, []);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      if (file.size > 1000000) {
        toast.error(`${file.name} is too large (max 1MB)`);
        continue;
      }
      try {
        let text = "";
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            fullText += strings.join(" ") + "\n";
          }
          text = fullText;
        } else {
          text = await file.text();
        }
        
        setUploadedDocs(prev => [...prev, { name: file.name, content: text }]);
        toast.success(`Uploaded: ${file.name}`);
      } catch (err) {
        console.error("File upload error:", err);
        toast.error(`Failed to read ${file.name}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeDoc = (index: number) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const getUploadedDocsContext = () => {
    let context = "";
    if (srsContent.trim()) {
      context += `\n--- SRS Document Content ---\n${srsContent}\n`;
    }
    if (uploadedDocs.length > 0) {
      context += uploadedDocs.map(d => `\n--- Uploaded Document: ${d.name} ---\n${d.content.slice(0, 3000)}`).join("\n");
    }
    return context;
  };

  const toggleExpand = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId);
      return next;
    });
  };

  const generatePhase = useCallback(async (phaseId: string, desc?: string, feedback?: string) => {
    const description = desc || projectDesc;
    if (!description.trim()) return;

    setError(null);
    setLoadingPhase(phaseId);
    setActivePhase(phaseId);
    setExpandedPhases(prev => new Set(prev).add(phaseId));

    const phaseOrder = PHASES.map(p => p.id);
    const currentIdx = phaseOrder.indexOf(phaseId);
    let previousContent = "";
    for (let i = 0; i < currentIdx; i++) {
      const prevId = phaseOrder[i];
      if (phaseResults[prevId]) {
        previousContent += `\n\n--- ${PHASES[i].label} Output ---\n${phaseResults[prevId].slice(0, 2000)}`;
      }
    }

    abortRef.current = new AbortController();

    let accumulated = "";
    await streamPhase(
      description, phaseId, previousContent,
      getUploadedDocsContext(),
      feedback || phaseFeedback[phaseId] || "",
      (delta) => { accumulated += delta; setPhaseResults(prev => ({ ...prev, [phaseId]: accumulated })); },
      () => setLoadingPhase(null),
      (err) => { setError(err); setLoadingPhase(null); },
      abortRef.current.signal,
    );
    return accumulated;
  }, [projectDesc, phaseResults, uploadedDocs, phaseFeedback]);

  const generateAll = async () => {
    if (!projectDesc.trim()) return;
    setGeneratingAll(true);
    setPhaseResults({});
    setError(null);

    for (const phase of PHASES) {
      const result = await generatePhase(phase.id, projectDesc);
      if (!result || error) break;
    }
    setGeneratingAll(false);
    setTimeout(() => {
      const currentResults = { ...phaseResults };
      if (Object.keys(currentResults).length > 0) {
        const projects = JSON.parse(localStorage.getItem("sdlc_projects") || "[]");
        projects.unshift({
          id: Date.now().toString(),
          name: projectDesc.split(/[-–—.]/)[0].trim().slice(0, 60) || "Untitled Project",
          description: projectDesc,
          createdAt: new Date().toISOString(),
          phases: currentResults,
        });
        localStorage.setItem("sdlc_projects", JSON.stringify(projects.slice(0, 50)));
        toast.success("Project auto-saved to history!");
      }
    }, 500);
  };

  const handleRefine = (phaseId: string, feedback: string) => {
    setPhaseFeedback(prev => ({ ...prev, [phaseId]: feedback }));
    generatePhase(phaseId, undefined, feedback);
    toast("Regenerating with your feedback...", { icon: "🔄" });
  };

  const stopGeneration = () => { abortRef.current?.abort(); setLoadingPhase(null); setGeneratingAll(false); };

  const reset = () => { stopGeneration(); setPhaseResults({}); setActivePhase(null); setExpandedPhases(new Set()); setError(null); setPhaseFeedback({}); };

  const saveToHistory = useCallback(() => {
    if (Object.keys(phaseResults).length === 0) return;
    const projects = JSON.parse(localStorage.getItem("sdlc_projects") || "[]");
    projects.unshift({
      id: Date.now().toString(),
      name: projectDesc.split(/[-–—.]/)[0].trim().slice(0, 60) || "Untitled Project",
      description: projectDesc,
      createdAt: new Date().toISOString(),
      phases: { ...phaseResults },
    });
    localStorage.setItem("sdlc_projects", JSON.stringify(projects.slice(0, 50)));
  }, [phaseResults, projectDesc]);

  const downloadFullReport = () => {
    // For full report, we'll still use the text-based one as it's hard to capture multiple elements perfectly
    const projectName = projectDesc.split(/[-–—.]/)[0].trim() || "Project";
    let report = `# SDLC Report: ${projectName}\n\n**Description:** ${projectDesc}\n**Generated:** ${new Date().toLocaleString()}\n\n---\n\n`;
    PHASES.forEach((phase, i) => {
      if (phaseResults[phase.id]) report += `## Phase ${i + 1}: ${phase.label}\n\n${phaseResults[phase.id]}\n\n---\n\n`;
    });
    downloadAsPDF(report, `${projectName.replace(/\s+/g, '-').toLowerCase()}-complete-sdlc-report.pdf`);
  };

  const downloadPhase = (phase: PhaseConfig) => {
    if (!phaseResults[phase.id]) return;
    const projectName = projectDesc.split(/[-–—.]/)[0].trim() || "Project";
    downloadElementAsPDF(`phase-content-${phase.id}`, `${projectName.replace(/\s+/g, '-').toLowerCase()}-${phase.fileName}`);
  };

  const completedCount = PHASES.filter(p => phaseResults[p.id] && !loadingPhase).length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
        <motion.div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4" initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
          <Sparkles className="w-3.5 h-3.5" />
          Cloud-Enabled AI Framework for Optimizing SDLC
        </motion.div>
        <h1 className="text-4xl font-bold font-heading tracking-tight">
          <span className="gradient-text">SDLC</span> Generator
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-sm">
          Upload SRS documents or enter a project description — the RAG-based AI pipeline generates complete SDLC artifacts through all 6 phases
        </p>
      </motion.div>

      {/* ===== DATA COLLECTION LAYER ===== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 space-y-5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Layer Label */}
        <div className="relative flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          Layer 1 — Data Collection & Preprocessing
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="w-4 h-4" />
              Project Name / Brief
            </div>
            <textarea
              value={projectDesc}
              onChange={e => setProjectDesc(e.target.value)}
              placeholder="e.g. Student Management System"
              className="w-full h-32 p-4 bg-background/80 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/40 transition-shadow"
              disabled={!!loadingPhase}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="w-4 h-4" />
              SRS Document / Full Requirements
            </div>
            <textarea
              value={srsContent}
              onChange={e => setSrsContent(e.target.value)}
              placeholder="Enter detailed Software Requirement Specification (SRS) content here. This will be used as the primary source for generating all SDLC artifacts."
              className="w-full h-32 p-4 bg-background/80 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/40 transition-shadow"
              disabled={!!loadingPhase}
            />
          </div>
        </div>

        {/* Document Upload */}
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
            <Upload className="w-4 h-4" />
            Upload Documents (SRS, Source Code, Defect Data)
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.pdf,.csv,.json,.py,.js,.ts,.java,.html,.css,.sql,.xml"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!!loadingPhase}
            className="w-full border-2 border-dashed border-border/60 rounded-xl p-4 text-center hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-muted-foreground"
          >
            <Upload className="w-5 h-5 mx-auto mb-1 opacity-50" />
            Click to upload SRS documents (PDF/Text), source code, or defect datasets
            <br />
            <span className="text-xs opacity-50">Supports .pdf, .txt, .md, .csv, .json, .py, .js, .ts (max 1MB each)</span>
          </button>
          
          {/* Uploaded Files */}
          {uploadedDocs.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {uploadedDocs.map((doc, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  <FileText className="w-3 h-3" />
                  {doc.name}
                  <button onClick={() => removeDoc(i)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 relative">
          <Button 
            onClick={generateAll} 
            disabled={!projectDesc.trim() || (!srsContent.trim() && uploadedDocs.length === 0) || !!loadingPhase} 
            size="lg" 
            className="gradient-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
          >
            {generatingAll ? (<><Loader2 className="w-4 h-4 animate-spin" /> Generating All Phases...</>) : (<><Play className="w-4 h-4" /> Generate All SDLC Phases</>)}
          </Button>
          {loadingPhase && <Button variant="destructive" size="lg" onClick={stopGeneration}>Stop</Button>}
          {Object.keys(phaseResults).length > 0 && !loadingPhase && (
            <>
              <Button variant="outline" size="lg" onClick={() => { saveToHistory(); toast.success("Saved!"); }}>
                <Save className="w-4 h-4" /> Save
              </Button>
              <Button variant="outline" size="lg" onClick={downloadFullReport}>
                <Download className="w-4 h-4" /> Download All
              </Button>
              <Button variant="ghost" size="lg" onClick={reset}>
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
            </>
          )}
        </div>

        {/* Quick Examples */}
        {!Object.keys(phaseResults).length && (
          <div className="flex flex-wrap gap-2 items-center relative">
            <span className="text-xs text-muted-foreground font-medium">Quick start:</span>
            {["Student Management System", "E-Commerce Platform", "Hospital Management System", "Online Banking Application", "Library Management System"].map(example => (
              <button 
                key={example} 
                onClick={() => {
                  setProjectDesc(example);
                  setSrsContent(`${example} - Detailed SRS:\n\n1. User authentication with RBAC\n2. Dashboard with analytics\n3. Full CRUD for main entities\n4. PDF report generation\n5. Responsive design for mobile/web`);
                }} 
                className="px-3 py-1.5 text-xs rounded-full border border-primary/20 text-primary hover:bg-primary/10 transition-all hover:border-primary/40 font-medium"
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Progress Bar */}
      {Object.keys(phaseResults).length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold">RAG-Based AI Inference Pipeline</span>
            </div>
            <span className="text-sm font-mono text-primary font-bold">{completedCount}/{PHASES.length}</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div className="h-full gradient-primary rounded-full" animate={{ width: `${(completedCount / PHASES.length) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
          <div className="flex gap-1.5 mt-3">
            {PHASES.map((phase) => (
              <div key={phase.id} className={`flex-1 h-1.5 rounded-full transition-colors ${phaseResults[phase.id] ? loadingPhase === phase.id ? "bg-primary animate-pulse" : "bg-primary" : "bg-secondary"}`} />
            ))}
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl p-4 text-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">!</div>
          {error}
        </motion.div>
      )}

      {/* ===== SDLC ARTIFACT GENERATION (Phase Cards) ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          Layer 3 — SDLC Artifact Generation
        </div>

        {PHASES.map((phase, i) => {
          const hasResult = !!phaseResults[phase.id];
          const isLoading = loadingPhase === phase.id;
          const isExpanded = expandedPhases.has(phase.id);
          const Icon = phase.icon;

          return (
            <motion.div key={phase.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className={`rounded-2xl overflow-hidden border transition-all duration-300 ${isLoading ? "ring-2 ring-primary/50 border-primary/30 bg-gradient-to-r " + PHASE_COLORS[phase.id] : hasResult ? "bg-gradient-to-r border-border/50 " + PHASE_COLORS[phase.id] : "glass-card"}`}>
              {/* Phase Header */}
              <div className="flex items-center gap-4 p-5 cursor-pointer hover:bg-secondary/20 transition-colors" onClick={() => hasResult && toggleExpand(phase.id)}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${hasResult && !isLoading ? "bg-success/15 text-success" : isLoading ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20" : PHASE_ICON_COLORS[phase.id]}`}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : hasResult ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider bg-secondary/50 px-2 py-0.5 rounded">Phase {i + 1}</span>
                    <h3 className="font-heading font-bold text-sm">{phase.label}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!hasResult && !isLoading && !generatingAll && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs" 
                      onClick={(e) => { e.stopPropagation(); generatePhase(phase.id); }} 
                      disabled={!projectDesc.trim() || (!srsContent.trim() && uploadedDocs.length === 0) || !!loadingPhase}
                    >
                      <Play className="w-3 h-3" /> Generate
                    </Button>
                  )}
                  {hasResult && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); downloadPhase(phase); }} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title={`Download ${phase.label}`}>
                        <FileDown className="w-4 h-4" />
                      </button>
                      <CopyButton text={phaseResults[phase.id]} />
                      <div className="w-6 h-6 flex items-center justify-center">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Phase Content */}
              <AnimatePresence>
                {(isExpanded || isLoading) && (hasResult || isLoading) && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <div id={`phase-content-${phase.id}`} className="px-5 pb-5 border-t border-border/30 pt-4 max-h-[600px] overflow-y-auto bg-background">
                      <MarkdownRenderer content={phaseResults[phase.id] || ""} />
                      {isLoading && <span className="inline-block w-2 h-5 bg-primary animate-pulse rounded-sm ml-1" />}
                    </div>
                    <div className="px-5 pb-5 pt-0">
                      {hasResult && !isLoading && (
                        <>
                          <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-3">
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => downloadPhase(phase)}>
                              <Download className="w-3 h-3" /> Download {phase.label} (PDF)
                            </Button>
                            <CopyButton text={phaseResults[phase.id]} />
                          </div>
                          {/* Feedback Loop */}
                          <PhaseFeedback phaseId={phase.id} onRefine={(fb) => handleRefine(phase.id, fb)} />
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* ===== EVALUATION & OUTPUT LAYER ===== */}
      {Object.keys(phaseResults).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Layer 4 — Evaluation & SDLC Output
          </div>
          <EvaluationMetrics phaseResults={phaseResults} />
        </div>
      )}
    </div>
  );
}

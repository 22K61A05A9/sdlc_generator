import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Eye, Clock, FolderOpen, Download, Play, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import MermaidDiagram from "@/components/MermaidDiagram";
import { toast } from "sonner";

interface SavedProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  phases: Record<string, string>;
}

const phaseLabels: Record<string, string> = {
  requirements: "Requirements Analysis",
  design: "System Design",
  implementation: "Code Generation",
  testing: "Testing & QA",
  deployment: "Cloud Deployment",
  maintenance: "Maintenance & Defect Detection",
};

const phaseOrder = ["requirements", "design", "implementation", "testing", "deployment", "maintenance"];

function simpleMarkdown(md: string): string {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
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

function PhaseContent({ content }: { content: string }) {
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
    <div className="space-y-3">
      {segments.map((seg, i) =>
        seg.type === "mermaid" ? (
          <MermaidDiagram key={i} chart={seg.content} />
        ) : (
          <div
            key={i}
            className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-pre:bg-sidebar prose-pre:text-sidebar-foreground prose-pre:rounded-xl prose-pre:border prose-pre:border-border"
            dangerouslySetInnerHTML={{ __html: simpleMarkdown(seg.content) }}
          />
        )
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function ProjectHistory() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SavedProject[]>(() => {
    try { return JSON.parse(localStorage.getItem("sdlc_projects") || "[]"); }
    catch { return []; }
  });
  const [search, setSearch] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem("sdlc_projects", JSON.stringify(updated));
    if (expandedProject === id) setExpandedProject(null);
    toast.success("Project deleted");
  };

  const togglePhase = (key: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const downloadReport = (project: SavedProject) => {
    let report = `# SDLC Report: ${project.name}\n\n`;
    report += `**Description:** ${project.description}\n**Generated:** ${new Date(project.createdAt).toLocaleString()}\n\n---\n\n`;
    phaseOrder.forEach((phaseId, i) => {
      if (project.phases[phaseId]) {
        report += `## Phase ${i + 1}: ${phaseLabels[phaseId]}\n\n${project.phases[phaseId]}\n\n---\n\n`;
      }
    });
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-sdlc-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadIntoGenerator = (project: SavedProject) => {
    // Store in sessionStorage so generator can pick it up
    sessionStorage.setItem("sdlc_load_project", JSON.stringify(project));
    navigate("/");
    toast.success("Project loaded into generator!");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-heading">
          <span className="gradient-text">Project</span> History
        </h1>
        <p className="text-muted-foreground mt-1">View, reuse, and download your previously generated SDLC projects</p>
      </motion.div>

      {/* Search */}
      <div className="glass-card rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-12 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-lg text-muted-foreground">No projects yet</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Generate your first SDLC project from the Generator page.</p>
          <Button className="mt-4 gradient-primary text-primary-foreground" onClick={() => navigate("/")}>
            <Play className="w-4 h-4" /> Go to Generator
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((project, i) => {
            const isExpanded = expandedProject === project.id;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl overflow-hidden"
              >
                {/* Project Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-base">{project.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-primary font-medium">
                          {Object.keys(project.phases).length}/6 phases
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {phaseOrder.filter(id => project.phases[id]).map(phaseId => (
                          <span key={phaseId} className="px-2 py-0.5 text-xs rounded-full bg-success/10 text-success border border-success/20">
                            {phaseLabels[phaseId]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setExpandedProject(isExpanded ? null : project.id)}>
                        <Eye className="w-4 h-4" /> {isExpanded ? "Close" : "View"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => loadIntoGenerator(project)}>
                        <Play className="w-4 h-4" /> Reuse
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadReport(project)}>
                        <Download className="w-4 h-4" /> Export
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => deleteProject(project.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Phase Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-border"
                    >
                      <div className="p-5 space-y-3">
                        {phaseOrder.filter(id => project.phases[id]).map((phaseId) => {
                          const phaseKey = `${project.id}-${phaseId}`;
                          const isPhaseOpen = expandedPhases.has(phaseKey);
                          return (
                            <div key={phaseId} className="border border-border/50 rounded-xl overflow-hidden">
                              <button
                                onClick={() => togglePhase(phaseKey)}
                                className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                    {phaseOrder.indexOf(phaseId) + 1}
                                  </div>
                                  <span className="font-heading font-semibold text-sm">{phaseLabels[phaseId]}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CopyButton text={project.phases[phaseId]} />
                                  {isPhaseOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                </div>
                              </button>
                              {isPhaseOpen && (
                                <div className="px-4 pb-4 max-h-[500px] overflow-y-auto">
                                  <PhaseContent content={project.phases[phaseId]} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { motion } from "framer-motion";
import MermaidDiagram from "@/components/MermaidDiagram";
import { Layers, Database, Brain, BarChart3, RefreshCw, FileText, Code2, GitBranch } from "lucide-react";

const layers = [
  {
    id: 1,
    title: "Data Collection & Preprocessing Layer",
    color: "bg-blue-500/15 text-blue-500 border-blue-500/20",
    dotColor: "bg-blue-500",
    icon: Database,
    items: [
      "SRS Document Upload",
      "GitHub Source Code Input",
      "Defect Dataset (NASA KC1)",
      "Data Cleaning & Parsing",
      "Feature Extraction (Text Features + Code Metrics)",
    ],
  },
  {
    id: 2,
    title: "Embeddings & Model Development Layer",
    color: "bg-violet-500/15 text-violet-500 border-violet-500/20",
    dotColor: "bg-violet-500",
    icon: Brain,
    items: [
      "Embedding Generation (SRS + Code embeddings)",
      "Vector Database (Semantic Storage)",
      "Feature Selection & Optimization",
      "Hybrid AI Model (CNN + LSTM / ML Models)",
    ],
  },
  {
    id: 3,
    title: "RAG-Based AI Inference & SDLC Artifact Generation",
    color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
    dotColor: "bg-emerald-500",
    icon: Code2,
    items: [
      "Context Retrieval (Semantic search from previous phases)",
      "Prompt Augmentation (User query + retrieved context)",
      "Large Language Model (Gemini AI via Cloud Gateway)",
      "SDLC Artifact Generation (Design, Code, Test Artifacts)",
    ],
  },
  {
    id: 4,
    title: "Evaluation & SDLC Output Layer",
    color: "bg-amber-500/15 text-amber-500 border-amber-500/20",
    dotColor: "bg-amber-500",
    icon: BarChart3,
    items: [
      "Prediction Output for all 6 SDLC Phases",
      "Evaluation Metrics (Completeness, Coverage, Quality)",
      "Model Performance Analysis",
      "Downloadable Reports & Documentation",
    ],
  },
];

const architectureMermaid = `graph LR
    subgraph L1[Data Collection Layer]
        A1[SRS Documents] --> A2[Data Cleaning]
        A3[Source Code] --> A2
        A4[Defect Dataset] --> A2
        A2 --> A5[Feature Extraction]
    end

    subgraph L2[Embeddings & Model Layer]
        B1[Embedding Generation] --> B2[Vector Storage]
        B3[Feature Selection] --> B4[Hybrid AI Model]
    end

    subgraph L3[RAG-Based AI Inference]
        C1[Context Retrieval] --> C2[Prompt Augmentation]
        C2 --> C3[LLM - Gemini AI]
        C3 --> C4[SDLC Artifact Generation]
    end

    subgraph L4[Evaluation & Output]
        D1[Quality Metrics] --> D2[Performance Analysis]
        D2 --> D3[SDLC Phase Outputs]
    end

    A5 --> B1
    A5 --> B3
    B2 --> C1
    B4 --> C3
    C4 --> D1
    D2 -.->|Feedback Loop| B4`;

const sdlcOutputMermaid = `graph TD
    GEN[SDLC Generator] --> P1[Requirements Phase]
    GEN --> P2[Design Phase - UML & Architecture]
    GEN --> P3[Implementation Phase - Code Generation]
    GEN --> P4[Testing Phase - Test Cases & Defect Analysis]
    GEN --> P5[Deployment Phase - CI/CD & Cloud]
    GEN --> P6[Maintenance Phase - Monitoring & Updates]
    
    P1 --> |Context| P2
    P2 --> |Context| P3
    P3 --> |Context| P4
    P4 --> |Context| P5
    P5 --> |Context| P6
    P6 -.->|Feedback| P1`;

export default function Architecture() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
        <motion.div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
          <Layers className="w-3.5 h-3.5" />
          System Architecture
        </motion.div>
        <h1 className="text-4xl font-bold font-heading tracking-tight">
          <span className="gradient-text">Framework</span> Architecture
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-sm">
          4-layer cloud-enabled AI architecture with RAG-based inference and model refinement feedback loop
        </p>
      </motion.div>

      {/* Architecture Diagram */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
        <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          System Architecture Diagram
        </h3>
        <MermaidDiagram chart={architectureMermaid} />
      </motion.div>

      {/* Layer Cards */}
      <div className="space-y-4">
        {layers.map((layer, i) => {
          const Icon = layer.icon;
          return (
            <motion.div
              key={layer.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              className={`glass-card rounded-2xl p-5 border-l-4 ${layer.color}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${layer.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Layer {layer.id}</span>
                  <h3 className="font-heading font-bold text-sm">{layer.title}</h3>
                </div>
              </div>
              <ul className="space-y-1.5 ml-13">
                {layer.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <div className={`w-1.5 h-1.5 rounded-full ${layer.dotColor} mt-1.5 shrink-0`} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {/* Feedback Loop */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card rounded-2xl p-6 border-l-4 border-rose-500/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Continuous</span>
            <h3 className="font-heading font-bold text-sm">Model Refinement Feedback Loop</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground ml-13">
          Users can rate and provide feedback on each generated phase. The system re-generates artifacts incorporating user corrections, improving accuracy over iterations. This feedback is passed back through the RAG pipeline for context-aware refinement.
        </p>
      </motion.div>

      {/* SDLC Output Flow */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card rounded-2xl p-6">
        <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          SDLC Phase Output Flow
        </h3>
        <MermaidDiagram chart={sdlcOutputMermaid} />
      </motion.div>
    </div>
  );
}

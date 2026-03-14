# Cloud-Enabled AI Framework for SDLC Automation

A RAG-based AI-powered web application that automatically generates all 6 phases of the Software Development Life Cycle (SDLC) from a project description, uploaded documents, and defect datasets.

## 🏗️ System Architecture (4-Layer)

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Data Collection & Preprocessing           │
│  ├── SRS Document Upload                            │
│  ├── GitHub Source Code Input                       │
│  ├── Defect Dataset (NASA KC1)                      │
│  ├── Data Cleaning & Parsing                        │
│  └── Feature Extraction (Text + Code Metrics)       │
├─────────────────────────────────────────────────────┤
│  Layer 2: Embeddings & Model Development            │
│  ├── Embedding Generation (SRS + Code)              │
│  ├── Vector Database (Semantic Storage)             │
│  ├── Feature Selection & Optimization               │
│  └── Hybrid AI Model (CNN + LSTM / ML Models)       │
├─────────────────────────────────────────────────────┤
│  Layer 3: RAG-Based AI Inference & Generation       │
│  ├── Context Retrieval (Semantic Search)            │
│  ├── Prompt Augmentation (Query + Context)          │
│  ├── LLM (Google Gemini AI via Cloud Gateway)       │
│  └── SDLC Artifact Generation                       │
├─────────────────────────────────────────────────────┤
│  Layer 4: Evaluation & SDLC Output                  │
│  ├── Prediction Output for all 6 SDLC Phases       │
│  ├── Evaluation Metrics (Completeness, Quality)     │
│  ├── Model Performance Analysis                     │
│  └── Downloadable Reports & Documentation           │
└─────────────────────────────────────────────────────┘
         ↑                                    │
         └──── Model Refinement Feedback Loop ┘
```

## 📋 SDLC Phases Generated

| Phase | Output |
|-------|--------|
| **Requirements** | SRS document with functional & non-functional requirements, use cases, data entities |
| **Design** | System architecture, ER diagrams, class diagrams, sequence diagrams, API design (Mermaid) |
| **Implementation** | Project structure, database schema (SQL), backend API, frontend components, auth module |
| **Testing** | Unit tests, API tests, E2E scenarios, security checks, defect prediction, coverage matrix |
| **Deployment** | Cloud architecture, CI/CD pipeline (GitHub Actions), Dockerfile, docker-compose, monitoring |
| **Maintenance** | Maintenance strategy, predicted defects, KPIs, alert rules, backup plan, SLA, defect workflow |

## ✨ Key Features

- **RAG Pipeline** — Each phase retrieves context from previous phases for coherent, connected outputs
- **Document Upload** — Upload SRS documents, source code, or defect datasets to improve generation accuracy
- **Feedback Loop** — Rate outputs and request improvements; AI regenerates with user corrections
- **Evaluation Metrics** — Quality scoring based on completeness, code blocks, and diagram density
- **Per-Phase & Full Export** — Download individual phase `.md` files or a combined full project report
- **Project History** — All generated projects saved locally with reuse and export capabilities
- **Mermaid Diagrams** — Auto-rendered UML, ER, sequence, and architecture diagrams

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Framer Motion |
| UI Components | shadcn/ui, Radix UI primitives |
| Diagrams | Mermaid.js |
| AI Model | Google Gemini (via Lovable Cloud AI Gateway) |
| Backend | Lovable Cloud (Edge Functions for AI inference) |
| Build Tool | Vite |
| State Management | TanStack React Query |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## 📂 Project Structure

```
src/
├── components/
│   ├── MermaidDiagram.tsx    # Mermaid.js diagram renderer
│   ├── Sidebar.tsx           # Navigation sidebar
│   └── ui/                   # shadcn/ui components
├── pages/
│   ├── SDLCGenerator.tsx     # Main generator with upload, generation, feedback, export
│   ├── Architecture.tsx      # 4-layer architecture visualization
│   ├── ProjectHistory.tsx    # Saved projects with reuse & export
│   └── NotFound.tsx
├── integrations/
│   └── supabase/            

├── hooks/                    # Custom React hooks
├── lib/                      # Utility functions
├── index.css                 # Design system tokens & global styles
└── main.tsx                  # App entry point

supabase/
└── functions/
    └── generate-sdlc/        # Edge function: AI inference via Gemini
        └── index.ts
```

## 🔄 How It Works

1. **Input** — User enters a project description and optionally uploads SRS documents, source code, or defect datasets
2. **Data Collection (Layer 1)** — Documents are parsed and features extracted
3. **Embeddings (Layer 2)** — Text and code embeddings generated for semantic storage
4. **RAG Inference (Layer 3)** — Context from previous phases retrieved, prompt augmented, Gemini AI generates SDLC artifacts
5. **Evaluation (Layer 4)** — Outputs scored on completeness, coverage, and quality metrics
6. **Feedback Loop** — Users can refine any phase; AI regenerates incorporating corrections
7. **Export** — Download individual phases or full reports as Markdown files

## 📊 Evaluation Metrics

Each generated phase is evaluated on:
- **Completeness Score** — Percentage of expected sections present
- **Code Block Count** — Number of code snippets generated
- **Diagram Density** — Number of Mermaid diagrams included
- **Overall Quality** — Weighted composite score (0-100%)

## 📄 License

This project is built for academic/research purposes as part of a Cloud-Enabled AI Framework study.

---

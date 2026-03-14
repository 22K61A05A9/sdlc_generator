---
description: Repository Information Overview
alwaysApply: true
---

# Cloud-Enabled AI Framework for SDLC Automation

## Summary
A RAG-based AI-powered web application designed to automatically generate all 6 phases of the Software Development Life Cycle (SDLC) from project descriptions, uploaded documents, and defect datasets. It utilizes a 4-layer architecture covering data collection, embedding generation, RAG-based AI inference via Google Gemini, and evaluation.

## Structure
- `src/`: Core React frontend application.
  - `components/`: UI components including shadcn/ui primitives and Mermaid diagram renderers.
  - `pages/`: Main application views (Generator, Architecture, Project History).
  - `integrations/`: Supabase/Lovable Cloud integration.
  - `hooks/` & `lib/`: Custom React hooks and utility functions.
- `supabase/functions/`: Deno-based Edge Functions for AI inference.
  - `generate-sdlc/`: Main AI processing logic using Gemini.
- `public/`: Static assets and configuration.

## Language & Runtime
**Language**: TypeScript (React 18)  
**Version**: Node.js 18+  
**Build System**: Vite  
**Package Manager**: npm (supports Bun/pnpm)

## Dependencies
**Main Dependencies**:
- `@supabase/supabase-js`: Backend integration.
- `@tanstack/react-query`: State management and data fetching.
- `framer-motion`: Smooth UI animations.
- `mermaid`: Diagram rendering.
- `lucide-react`: Iconography.
- `radix-ui` & `shadcn/ui`: Accessible UI components.
- `recharts`: Data visualization.
- `zod`: Schema validation.

**Development Dependencies**:
- `vitest`: Unit testing framework.
- `typescript`: Static typing.
- `eslint`: Code linting.
- `tailwindcss`: Styling engine.

## Build & Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Testing
**Framework**: Vitest / React Testing Library  
**Test Location**: `src/test/`  
**Naming Convention**: `*.test.ts`, `*.test.tsx`  
**Configuration**: `vitest.config.ts`

**Run Command**:
```bash
npm test
```

## Main Files & Resources
- `src/pages/SDLCGenerator.tsx`: Primary logic for AI-driven SDLC artifact generation.
- `supabase/functions/generate-sdlc/index.ts`: Edge function handling RAG pipeline and Gemini AI integration.
- `src/components/MermaidDiagram.tsx`: Component for rendering architectural diagrams.
- `tailwind.config.ts`: Design system and theme configuration.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const phasePrompts: Record<string, string> = {
  requirements: `You are a requirements analyst using RAG-based context retrieval. Given the project description and any uploaded documents (SRS, source code, defect data), generate a concise SRS. Keep it SHORT and PRACTICAL.

Include:
1. **Project Overview** - 2-3 sentences max
2. **Functional Requirements** - 6-8 key requirements (FR-001 format), one line each
3. **Non-Functional Requirements** - 4-5 items (NFR-001 format)
4. **User Roles** - List roles with one-line descriptions
5. **Key Use Cases** - 4-5 use cases, 2 lines each max
6. **Data Entities** - List main entities and key fields
7. **Acceptance Criteria** - Top 3 requirements only

If uploaded documents are provided, extract and align requirements from them. Be direct. No filler.`,

  design: `You are a software architect using RAG-based context from previous phases and uploaded documents. Generate a concise system design.

Include:
1. **Architecture Pattern** - 1-2 sentences
2. **System Architecture** - Mermaid flowchart
3. **Database ER Diagram** - Mermaid erDiagram with entities and relationships
4. **Class Diagram** - Mermaid classDiagram for core classes
5. **Sequence Diagram** - Mermaid sequence for the main user flow
6. **API Endpoints** - Table: Method | Path | Description
7. **Tech Stack** - Simple list

Use \`\`\`mermaid blocks. Diagrams over text.`,

  implementation: `You are a full-stack developer. Using context from requirements and design phases, generate working code. NO prose - just code.

Include:
1. **Project Structure** - Tree format
2. **Database Schema** - CREATE TABLE SQL
3. **Backend API** - Key endpoint implementations (Node.js/Express)
4. **Frontend Components** - Core React components
5. **Auth Module** - Login/signup code
6. **Core Feature** - Main business logic

If source code was uploaded, analyze it and generate compatible code. Comments inside code only.`,

  testing: `You are a QA engineer. Using context from all previous phases and any defect datasets provided, generate practical test cases.

Include:
1. **Test Tools** - One line
2. **Unit Tests** - 8 test cases with code (Jest)
3. **API Tests** - 5 endpoint tests
4. **E2E Scenarios** - 4 scenarios as step lists
5. **Security Checks** - 4-5 test cases
6. **Defect Prediction** - If defect data provided, analyze patterns and predict likely defect areas
7. **Coverage Matrix** - Table: Requirement | Test IDs

If defect dataset (NASA KC1 or similar) is uploaded, use it for defect prediction analysis.`,

  deployment: `You are a DevOps engineer. Generate cloud deployment configs.

Include:
1. **Cloud Architecture** - Mermaid diagram
2. **CI/CD Pipeline** - GitHub Actions YAML
3. **Dockerfile** - Complete
4. **docker-compose.yml** - Complete
5. **Environment Config** - .env template
6. **Monitoring** - Key metrics and alerts
7. **Cost Estimate** - Monthly table

Actual config files. No theory.`,

  maintenance: `You are a maintenance engineer. Using defect data and project context, generate a maintenance plan.

Include:
1. **Strategy** - 3-4 bullet points
2. **Predicted Defects** - Table: ID | Description | Severity | Component | Fix
3. **Monitoring KPIs** - 5-6 metrics with thresholds
4. **Alert Rules** - Table format
5. **Backup Plan** - 4-5 bullets
6. **SLA** - Table: Metric | Target
7. **Defect Workflow** - Mermaid flowchart

If defect dataset provided, analyze it for common patterns and predict maintenance needs.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription, phase, previousPhaseContent, uploadedDocuments, feedbackContext } = await req.json();

    if (!projectDescription || !phase) {
      return new Response(
        JSON.stringify({ error: "projectDescription and phase are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = phasePrompts[phase];
    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: `Invalid phase: ${phase}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build RAG-augmented user message with all context
    let userMessage = `Project Description: ${projectDescription}`;
    
    if (uploadedDocuments) {
      userMessage += `\n\n=== UPLOADED DOCUMENTS (Data Collection Layer) ===\n${uploadedDocuments}`;
    }
    
    if (previousPhaseContent) {
      userMessage += `\n\n=== CONTEXT FROM PREVIOUS PHASES (RAG Context Retrieval) ===\n${previousPhaseContent}`;
    }

    if (feedbackContext) {
      userMessage += `\n\n=== USER FEEDBACK (Model Refinement Loop) ===\nThe user wants these improvements: ${feedbackContext}\nPlease regenerate with these improvements incorporated.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-sdlc error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

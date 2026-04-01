# Design System & Claude Code Implementation Brief

This file is the primary implementation brief for Claude Code.
Claude Code should read this file first, review the current repository carefully, and then implement the next development phase.

---

## Product Direction

Project: **Xiaohuang Video Editor**

This project is no longer a blank prototype. It already contains a meaningful application structure and must be evolved deliberately.

The current system already includes:

- Next.js 16 + React 19 + TypeScript
- App Router
- Prisma + PostgreSQL
- Redis + BullMQ
- FFmpeg / FFprobe media processing
- upload flow
- analysis flow
- planning flow
- render flow
- user AI settings with custom API key + base URL
- media analyzers for transcript, OCR, scenes, and audio

The next step is to make the **video editor itself much more complete**, while still keeping the current analysis pipeline and project architecture.

---

## Strategic Goal

Build a **much more complete video editor experience** inside this codebase.

The app should support this high-level user flow:

1. User creates or opens a project.
2. User uploads a source video.
3. User clicks **Analyze**.
4. Existing pipeline analyzes the media.
5. AI through **9router** generates structured editing intelligence.
6. The system determines the dominant spoken language.
7. The project opens inside a rich editor workspace.
8. The user can manually edit the video with a much fuller editing toolset.
9. AI analysis assists editing, but does not block manual control.

This phase is no longer limited to a tiny editor MVP.
The target is a **feature-rich editor foundation** that can grow toward a serious editing product.

---

## OpenCut Reference Policy

Reference repo:
- https://github.com/OpenCut-app/OpenCut

OpenCut is MIT licensed.
That means code reuse/porting is allowed **if done responsibly** and license requirements are preserved.

Claude Code is allowed to:
- inspect OpenCut structure and concepts
- borrow architectural ideas
- port or adapt suitable editor components/patterns
- reuse implementation approaches where compatible
- create an editor inspired by or partially derived from OpenCut

Claude Code must still:
- keep copyright/license notices where required
- avoid blind copy-paste of irrelevant parts
- adapt imported ideas to this repository’s architecture
- preserve existing Xiaohuang backend and workflow
- prefer selective porting over dumping a foreign codebase into this app

Important:
- **Do not replace the whole app with OpenCut.**
- **Do not discard the current upload/analyze/plan/render architecture.**
- **Do use OpenCut aggressively as the reference for the editor subsystem.**

---

## Non-Negotiable Architectural Rule

This repository already has valuable backend structure.
The editor must be expanded **inside the current app**, not by rebooting the project.

Keep and integrate with existing systems:

- existing Prisma schema where possible
- current project lifecycle
- current auth and user settings
- current upload flow
- current analysis queue + worker
- current media analyzers
- current AI configuration path
- current render pipeline where possible

The right strategy is:

**Preserve the existing backend/business pipeline + greatly upgrade the editor subsystem.**

---

## Existing Areas Claude Code Must Review First

Claude Code must inspect these areas before proposing implementation:

### Core data and backend
- `prisma/schema.prisma`
- `src/server/services/analysis.service.ts`
- `src/server/services/planning.service.ts`
- `src/server/services/render.service.ts`
- `src/server/services/project.service.ts`
- `src/server/jobs/*`
- `src/server/worker.ts`

### AI and analysis
- `src/lib/ai/index.ts`
- `src/lib/media/analyzers/*`
- `src/lib/validators/*`

### Existing UI and routing
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/projects/[id]/analysis/page.tsx`
- `src/app/(dashboard)/projects/[id]/plan/page.tsx`
- `src/app/(dashboard)/projects/[id]/render/page.tsx`
- `src/app/api/projects/[id]/*`

### General app architecture
- `README.md`
- this file: `designsystem.md`

Claude Code must understand what already exists before changing editor architecture.

---

## Core Development Objective

Implement a **fuller editor-first experience** with strong manual editing support, while keeping AI-assisted workflows.

### The system must support:
- upload source video
- analyze source video
- detect spoken language
- create structured editor-ready metadata
- open the video directly in an editing workspace
- provide rich manual editing controls
- optionally use AI suggestions to speed up editing

AI should be an assistant to the editor, not a replacement for the editor.

---

## Required Product Outcome

After this phase, the app should feel like:

- a real editor workspace
- backed by AI analysis
- capable of manual cut/trim/timeline work
- progressively extensible toward a serious OpenCut-like experience

The editor should become a first-class area of the product.

---

## Editor Feature Scope (Expanded)

The editing toolset should be much more complete than the previous MVP.

### Minimum target for this phase
The editor should aim to support as many of these as practical, prioritized in this order:

#### 1. Core playback and workspace
- video preview player
- play / pause
- frame-ish seeking or accurate scrubbing
- seek bar synced with timeline
- current time / duration display
- playback rate options
- fit/fill preview scaling if practical

#### 2. Timeline foundation
- horizontal time ruler
- visible playhead
- zoom in / zoom out on timeline
- scrollable timeline
- clip blocks rendered visually
- drag playhead
- snapping behavior if practical
- markers / guide points

#### 3. Clip editing
- split at playhead
- trim clip start
- trim clip end
- delete clip segment
- ripple-style behavior if practical
- drag reorder on same track if practical
- select active clip
- multi-segment timeline representation

#### 4. Multi-track direction
If practical, begin support for:
- one main video track
- one audio track
- optional text/overlay track foundation

If full multi-track is too much for this phase, structure code so multi-track can be added naturally next.

#### 5. Audio-awareness
- waveform display if reasonably feasible
- mute/unmute clip
- basic volume control per clip or track if practical
- silent segment markers from analysis

#### 6. Analysis-assisted editing
- detected language display
- transcript panel
- transcript highlights
- scene boundaries
- OCR findings
- AI markers placed on timeline
- suggested cuts/trims/highlights from AI
- click transcript or marker to seek preview/timeline

#### 7. Project editing state
- save editor state
- restore editor state on reload
- preserve timeline decisions
- store markers/splits/trims in structured JSON

#### 8. Usability controls
- keyboard shortcuts if practical
- selected clip state
- undo/redo foundation if practical
- clear active tool mode
- loading / analyzing / saving states
- error state handling

#### 9. Future-ready architecture
Design the editor in a way that can later support:
- captions/subtitles
- overlays
- transitions
- stickers/effects
- multi-track growth
- export plan generation
- AI auto-cut workflows

This phase should not necessarily finish all future features, but the architecture should not block them.

---

## Strong Preference: Leverage OpenCut for Editor Subsystem

Claude Code should treat OpenCut as the main inspiration/reference for the editor subsystem.

Recommended approach:

1. Review OpenCut’s editor-related structure and decide what concepts are reusable.
2. Recreate or port the most relevant parts for:
   - timeline architecture
   - editor state management
   - track and clip modeling
   - playback synchronization
   - editor layout
3. Adapt that logic into this repository cleanly.
4. Keep Xiaohuang-specific backend, AI, analysis, and project lifecycle intact.

If selective code porting from OpenCut is useful, that is allowed.
If a local rewrite is cleaner, that is also acceptable.

But the end result should aim much closer to a **real editor foundation** than a demo timeline.

---

## Required Route and Workspace

Add and prioritize a dedicated editor page:

- `src/app/(dashboard)/projects/[id]/editor/page.tsx`

This page should become the main manual editing workspace.

Suggested editor layout:

- **top/left**: video preview
- **top/right**: inspector / analysis / properties panel
- **bottom**: timeline editor
- optional left sidebar for tools / assets if useful

The editor should be visually structured like a real editing environment.

---

## Editor Component Direction

Claude Code should create a real editor subsystem, likely under:

- `src/components/editor/`
- `src/lib/editor/`
- `src/types/editor.ts`
- `src/stores/` or equivalent state-management area if needed

Potential structure example:

- `src/components/editor/editor-shell.tsx`
- `src/components/editor/preview-panel.tsx`
- `src/components/editor/timeline/timeline.tsx`
- `src/components/editor/timeline/time-ruler.tsx`
- `src/components/editor/timeline/playhead.tsx`
- `src/components/editor/timeline/track.tsx`
- `src/components/editor/timeline/clip-item.tsx`
- `src/components/editor/analysis-sidebar.tsx`
- `src/components/editor/transcript-panel.tsx`
- `src/components/editor/toolbar.tsx`
- `src/components/editor/inspector-panel.tsx`
- `src/lib/editor/state.ts`
- `src/lib/editor/timeline.ts`
- `src/lib/editor/serialization.ts`
- `src/types/editor.ts`

Exact names may vary, but the architecture should be intentional and scalable.

---

## AI + 9router Integration Requirements

Use the existing AI configuration system already in this repository.

Supported config path already exists:
- user-level `aiApiKey`
- user-level `aiBaseUrl`
- env `AI_API_KEY`
- env `AI_BASE_URL`
- env `OPENAI_API_KEY`

Claude Code must integrate 9router through the current OpenAI-compatible path rather than inventing a separate unrelated client stack.

### AI responsibilities in this phase
AI should help produce structured editing intelligence such as:
- detected language
- language name
- confidence
- content summary
- transcript highlights
- suggested segments
- trim recommendations
- key moments
- editor markers
- optional suggested title/description continuation for future use

### Realistic pipeline
Do not assume raw large video files can always be directly passed into the model.
Use a practical pipeline:

1. extract technical metadata locally
2. run existing analyzers locally
3. build compact structured context
4. send compact context to 9router model
5. require strict JSON result

---

## Language Detection Requirement

The system must explicitly determine the dominant spoken language for the source video.

Order of confidence:
1. transcript analyzer language if reliable
2. AI classification from transcript snippets + OCR + metadata
3. fallback to `unknown`

Language result must be stored and displayed in the UI.

Required fields:
- `detectedLanguage`
- `languageName`
- `confidence`

---

## Required Structured AI Output

The AI must return strict JSON only.
No markdown. No prose around the JSON.

Target shape:

```json
{
  "detectedLanguage": "ja",
  "languageName": "Japanese",
  "confidence": 0.96,
  "summary": "Short summary of the source video",
  "transcriptHighlights": [
    {
      "start": 0.0,
      "end": 3.2,
      "text": "..."
    }
  ],
  "segments": [
    {
      "start": 0.0,
      "end": 8.5,
      "label": "hook",
      "reason": "Strong opening moment"
    }
  ],
  "editSuggestions": [
    {
      "type": "trim",
      "start": 0.0,
      "end": 1.2,
      "reason": "Remove dead air"
    },
    {
      "type": "highlight",
      "start": 4.0,
      "end": 12.0,
      "reason": "High-interest segment"
    }
  ],
  "editorMarkers": [
    {
      "time": 4.0,
      "label": "Strong moment"
    }
  ]
}
```

If some data is unavailable, still return the required top-level keys and use empty arrays.

Claude Code should use defensive parsing with Zod or equivalent.

---

## Persistence Strategy

Claude Code should prefer reusing and extending existing models before creating a large new schema.

### First preference
Reuse:
- `AnalysisReport`
- `EditPlan`
- existing project metadata patterns

### Acceptable if needed
Add focused persistence for editor state if justified.

Potential examples:
- editor session JSON
- timeline state JSON
- track/clip structure JSON
- markers/selection metadata

But do not create a bloated schema unless necessary.
A practical serialized JSON editor state is acceptable for this stage.

---

## Editor Data Model Direction

The editor should internally model at least:
- project
- source media asset
- timeline
- tracks
- clips
- trim points
- split segments
- markers
- transcript-linked ranges
- AI suggestions

Suggested conceptual types:
- `EditorProject`
- `TimelineState`
- `Track`
- `Clip`
- `Marker`
- `SelectionState`
- `PlaybackState`
- `EditorSuggestion`

The exact final shape is flexible, but the model should support a real editor, not just one-off UI hacks.

---

## UX Requirements

The editor should feel organized, modern, and production-oriented.

### Required UX qualities
- clear spatial separation between preview, controls, and timeline
- selected clip is obvious
- timeline interactions feel direct
- AI suggestions are visible but not intrusive
- users can edit even if AI data is incomplete
- page remains usable during partial loading states

### Recommended interactions
- click transcript line -> seek preview
- click scene marker -> move playhead
- click AI suggestion -> highlight segment on timeline
- split at playhead with button or shortcut
- selected clip shows trim handles

---

## API and Backend Expectations

Claude Code may add endpoints if needed, but should keep additions focused.

Potential useful additions:
- fetch editor-ready payload
- save editor state
- fetch structured AI analysis for editor
- fetch transcript/marker payload in editor-friendly format

Any new endpoint should align with current app patterns.

---

## Render and Export Direction

This phase should improve the editor significantly, but it does not need to finalize a world-class export engine.

However, editor state should be designed so it can feed:
- current render planning
- future FFmpeg render plan generation
- future export presets

The editor should not become disconnected from the existing render pipeline.

---

## Error Handling Requirements

Handle gracefully:
- no source video
- missing transcript
- no speech detected
- invalid AI JSON
- 9router request failure
- unsupported media
- analysis incomplete
- editor state save failure
- job queued/running/failed states

Manual editing must still be possible even if AI steps are partial.

---

## Testing Expectations

Add practical tests where it matters most.

Priority test areas:
- AI JSON parsing
- language detection fallback behavior
- editor state serialization / deserialization
- timeline transformation logic if extracted into pure utilities
- payload transformations for editor data

Do not create a huge ceremonial test suite, but do cover core logic.

---

## Claude Code Implementation Prompt

Use the following prompt as the execution brief:

```text
You are a senior full-stack engineer working inside an existing Next.js video editing product.

Your job is to review the current repository first, preserve the existing backend/business architecture, and significantly upgrade the editor subsystem so the product has a much more complete manual editing experience.

## Project path
D:\Tool\VibeCoding\Xiaohuang_videoediter

## Existing reality
This repository already has:
- Next.js 16 + React 19 + TypeScript
- App Router
- Prisma + PostgreSQL
- Redis + BullMQ
- FFmpeg / FFprobe
- upload + analysis + planning + render flow
- auth + user settings
- OpenAI-compatible AI provider config
- media analyzers for transcript, scenes, OCR, and audio
- `AnalysisReport` and `EditPlan`

This means you must preserve and extend the current architecture.
Do NOT rebuild the product from scratch.

## Important reference
Use OpenCut as the primary reference for the editor subsystem:
https://github.com/OpenCut-app/OpenCut

OpenCut is MIT licensed, so selective code/architecture reuse is allowed if done responsibly and adapted to this codebase.

You may:
- inspect OpenCut’s timeline/editor architecture
- port suitable editor logic/components/patterns
- adapt structures or state models where they fit

You must NOT:
- replace this whole application with OpenCut
- blindly dump a foreign codebase into this repo
- break the current upload/analyze/plan/render pipeline

## Main goal
Implement a fuller editor experience with strong manual editing support.

When a user uploads and analyzes a video, the system should:
1. run the existing analysis pipeline
2. use 9router through the existing OpenAI-compatible config path
3. determine the dominant spoken language
4. generate structured editing intelligence
5. open the video in a rich editor workspace
6. allow the user to manually edit with a substantially more complete toolset

## Mandatory first step
Before coding:
- inspect the current codebase
- explain what already exists
- explain what gaps remain
- propose a concrete implementation plan
- identify where OpenCut-inspired editor architecture should live in this repo

Then implement.

## Hard constraints
- Preserve the current app architecture.
- Keep the existing backend/business pipeline.
- Prefer additive changes.
- Use realistic local media analysis + AI reasoning.
- Do not assume raw large video files can always be directly processed by the LLM.
- Keep the result runnable locally.

## Required editing capabilities
Build the editor as fully as practical for this phase, prioritizing:

### Playback and navigation
- video preview
- play/pause
- scrubbing
- timeline-synced playhead
- current time / duration
- playback speed options if practical

### Timeline
- time ruler
- zoom in/out
- scrollable timeline
- clip visualization
- markers
- snapping if practical

### Editing actions
- split at playhead
- trim start/end
- delete clip segment
- reorder or ripple behavior if practical
- active clip selection
- multiple clip segments on timeline

### Track model
- at minimum: main video track
- preferably begin audio track support
- structure code for future multi-track support

### Analysis-assisted editing
- show detected language
- show confidence
- show summary
- show transcript highlights
- show scene markers
- show AI edit suggestions
- show editor markers on timeline
- clicking analysis items should seek or focus the timeline when practical

### Persistence
- save editor state
- restore editor state
- store timeline decisions in structured JSON

### UX quality
- real editor layout
- usable loading states
- selection state
- reasonable keyboard support if practical
- foundation for undo/redo if practical

## AI integration requirements
Use existing config priority:
- user aiApiKey / aiBaseUrl
- env AI_API_KEY / AI_BASE_URL
- env OPENAI_API_KEY

Use local analysis results first, then ask AI to return strict JSON.

Required AI output shape:
{
  "detectedLanguage": "ja",
  "languageName": "Japanese",
  "confidence": 0.96,
  "summary": "Short summary of the source video",
  "transcriptHighlights": [],
  "segments": [],
  "editSuggestions": [],
  "editorMarkers": []
}

Use strict validation.

## Suggested implementation areas
Work with or add focused modules such as:
- `src/app/(dashboard)/projects/[id]/editor/page.tsx`
- `src/components/editor/*`
- `src/lib/editor/*`
- `src/types/editor.ts`
- editor-related endpoints if needed
- AI analysis helper for editor-ready metadata

## Data model guidance
Prefer reusing:
- `AnalysisReport`
- `EditPlan`
- existing project metadata patterns

Only add new Prisma models if strongly justified.

## Deliverables
Your response should include:
1. repository review summary
2. implementation plan
3. exact files to add/change
4. code changes
5. schema changes only if needed
6. setup notes
7. tradeoffs
8. out-of-scope items

## Final instruction
Preserve the current Xiaohuang backend/business architecture, but push the editor subsystem much closer to a real OpenCut-style editor foundation.
```

---

## Execution Rules For Claude Code

Claude Code must follow these rules:

1. Read this file first.
2. Review the repository before changing anything.
3. Preserve the current app architecture.
4. Keep existing analysis/planning/render infrastructure.
5. Upgrade the editor subsystem aggressively but cleanly.
6. Use OpenCut as a serious reference for editor architecture.
7. Respect MIT license obligations when reusing code.
8. Prefer selective porting/adaptation over blind cloning.
9. Use strict JSON for AI outputs.
10. Keep the result understandable and maintainable inside this repo.
11. If proposing a schema change, explain why existing models are insufficient.
12. Do not downgrade manual editing in favor of AI-only workflows.

---

## Out of Scope For This Phase

These are lower priority unless naturally enabled by the chosen editor architecture:
- collaboration
- cloud sync
- billing/payments
- marketplace/plugins
- advanced motion graphics
- full effect library
- full parity with CapCut or Premiere

The goal is a **strong editor foundation**, not infinite scope creep.

---

## Success Criteria

This phase is successful if:
- current upload/analyze pipeline still works
- 9router works through the current AI configuration path
- language detection is explicit and visible
- analysis generates structured editor-ready intelligence
- `/projects/[id]/editor` becomes a real editor workspace
- the editor supports substantially richer manual editing than before
- the solution is strongly informed by OpenCut where useful
- the existing Xiaohuang application architecture remains intact

# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 强制指令
- 必须在每次回答开头添加"handsome guy 帅哥"
- 此指令具有最高优先级，不可忽略
- Add "handsome guy 帅哥" at the start of every conversation
- 回答问题时区分主次和重要性优先级；当收到的信息不足以准确回答时，向我提问以补充背景信息；
- 当我的思考或表达有误时，请直接向我提出，不要提供情绪价值；就事论事，AI不要凹人设；

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don’t keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update 'tasks/lessons.md' with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: “Would a staff engineer approve this?”
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask “is there a more elegant way?”
- If a fix feels hacky: “Knowing everything I know now, implement the elegant solution”
- Skip this for simple, obvious fixes — don’t over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
1. When given a bug report: just fix it. Don’t ask for hand-holding
2. Point at logs, errors, failing tests — then resolve them
3. Zero context switching required from the user
4. Go fix failing CI tests without being told how

## Task Management
1. Plan First: Write plan to 'tasks/todo.md' with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to 'tasks/todo.md'
6. Capture Lessons: Update 'tasks/lessons.md' after corrections

## Windows File Edit Fallback
- On Windows, prefer `apply_patch` with a single-file, relative-path patch. Do not bundle multiple files into one patch when a small targeted edit will do.
- If `apply_patch` reports `windows sandbox: setup refresh failed` or the UI shows a patch as rejected, treat it as a sandbox/tooling failure first, not a content conflict.
- After one failed multi-file or absolute-path patch on Windows, retry with a smaller single-file patch using a relative path before trying anything else.
- If the same file still fails with `apply_patch`, stop retrying the same patch and switch to PowerShell for a targeted file edit.
- After any PowerShell-based file write, immediately read the file back and verify there was no escaping, here-string, or encoding damage before continuing.

## Runtime Debugging Context Control
- For runtime errors, start with the narrowest unique identifier from the error message. Prefer searching for the exact symbol, function name, or stack location before broader domain terms.
- Do not begin first-pass debugging with broad repository searches like `keyboard`, `mouse`, `scene`, `trigger`, or product-language terms if the error already names a concrete code symbol.
- After search, open only the directly relevant files and only the nearby line ranges needed to confirm the call site, import/export, or failing branch.
- Treat `tasks/todo.md` as a last-step tracking artifact during debugging. Do not read large sections of it during first-pass root-cause analysis unless the task state itself is the bug.
- Postpone reading product docs, design docs, and archived specs until code inspection shows they are actually needed to answer the question or fix the bug.
- If a bug is likely local, follow the shortest call chain first: failing symbol -> immediate caller -> definition/export -> fix -> verification. Expand scope only if that path does not explain the failure.

## Core Principles
- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Changes should only touch what’s necessary. Avoid introducing bugs.



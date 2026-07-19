---
name: SkillForge Icon Pitfalls
description: Lucide-react icons the design subagent invented that don't exist in the installed version.
---

## Missing Icons (replaced with alternatives)
- `ChalkboardTeacher` → use `BookOpen` (in admin/Users.tsx for instructor role badge)

**Why:** Design subagents may hallucinate lucide-react icon names. Always grep for icon imports and verify against the installed version before declaring the frontend working.

**How to check:** `node -e "const l=require('./node_modules/.pnpm/lucide-react@.../lucide-react.js'); console.log(Object.keys(l).includes('IconName'))"`

# Banana Peel: Project Board

This board tracks all development tasks. It serves as our single source of truth for project management.

---

### Backlog (1)
*   **[T51] (New Feature)** Implement usage-based rate limiting for the default API key.

---

### In Progress (0)

---

### Done (86)
*   **[T86] (New Feature)** Refactor API Key Setting workflow.
*   **[T85] (Refactor)** Enhance API Inspector to show text responses.
*   **[T84] (Refactor)** Refactor application logging.
*   **[T83] (UI/UX)** Correct the collapse icon to a final, intuitive `> <` chevron design.
*   **[T82] (UI/UX)** Refine expand/collapse icons to a final, intuitive chevron design.
*   **[T81] (UI/UX)** Refine expand/collapse icons to a more intuitive chevron design.
*   **[T80] (UI/UX)** Refine 'Expanded Edit Modal' with a wider layout and more intuitive icons.
*   **[T79] (New Feature)** Implement 'Expanded Edit Modal' and 'Structured Prompt Caching'.
*   **[T78] (Refactor)** Perform final, definitive refinement of the 'Structured Edit' diff prompt.
*   **[T77] (Refactor)** Refine the 'Structured Edit' diffing prompt to be more systemic and reliable.
*   **[T76] (Refactor)** Perform code cleanup to remove all remnants of the reverted `TransformableObject` feature.
*   **[T75] (Bug Fix)** Fix bug where white selection mask is rendered into the 'Add Object' result.
*   **[T74] (Refactor)** Refine `addObjectToImage` prompt to be more robust and procedural.
*   **[T73] (Refactor)** Remove all code references to the reverted `TransformableObject` feature.
*   **[T72] (New Feature)** Implement the guided 'Add Object' workflow.
*   **[T71] (UI/UX)** Move 'Add Object' button to right-hand control group in canvas header.
*   **[T70] (UI/UX)** Add 'Add Object' button and fix 'New Image' confirmation modal.
*   **[T69] (UI/UX)** Refine UI for New Image and Force Delete buttons.
*   **[T68] (Bug Fix)** The 'Redo' button incorrectly performs an 'Undo' action.
*   **[T67] (Refactor)** Implement definitive 'Describe-and-Box-Mask' architecture for reliability.
*   **[T66] (Refactor)** Replace mask algorithm with a more robust 'Flood Fill' method.
*   **[T65] (Refactor)** Replace API-based mask generation with a reliable client-side algorithm.
*   **[T64] (Refactor)** Make inpaintBackground prompt more robust.
*   **[T63] (Refactor)** Make createPreciseMask more robust with a fallback mechanism.
*   **[T62] (Documentation)** Update design docs for API Call Inspector.
*   **[T61] (New Feature)** Add API Call Inspector for visual debugging.
*   **[T60] (Bug Fix)** Deleting an object sometimes deletes a previously selected object.
*   **[T59] (Refactor)** Improve `createPreciseMask` positional accuracy.
*   **[T58] (Documentation)** Document rejected client-side resizing architecture.
*   **[T57] (Bug Fix)** Fix object modification failures caused by dimension drift and mask misalignment.
*   **[T56] (Refactor)** Refactor object modification to a more reliable two-call inpaint/add workflow.
*   **[T55] (Bug Fix)** Redo action incorrectly performs an Undo.
*   **[T54] (New Feature)** Add structured prompt editing.
*   **[T53] (UI/UX)** Refine welcome message text and styling.
*   **[T52] (New Feature)** Support user-provided API keys.
*   **[T50] (UI/UX)** Refine Editing State UI.
*   **[T49] (Bug Fix)** Global edits incorrectly generate a new image.
*   **[T48] (UI/UX)** Refactor Canvas Header and Controls.
*   **[T47] (Refactor)** Strengthen aspect ratio constraint with quantitative prompt.
*   **[T46] (Refactor)** Implement prompt preprocessing for object modification.
*   **[T45] (Revert)** Revert the unapproved `TransformableObject` feature to fix the critical modification bug.
*   **[T44] (Bug Fix)** Newly generated images do not match canvas aspect ratio.
*   **[T43] (Bug Fix)** 'New Image' button is non-functional due to sandboxed environment.
*   **[T42] (New Feature)** Clearly separate UI into Gen and Edit state.
*   **[T41] (New Feature)** Implement in-app log viewer.
*   **[T40] (Investigation)** Investigate the source of the visible log viewer.
*   **[T39] (Process Improvement)** Formalize the 'Context Lock' Protocol.
*   **[T38] (Documentation)** Document the 'Pixels vs. Objects' challenge in DESIGN.md.
*   **[T37] (Process Improvement)** Analyze and document the architectural trade-offs of a single-call object modification workflow.
*   **[T36] (Refactor)** Improve object blending by refining the `replaceObjectInMask` prompt to be style-aware.
*   **[T35] (Bug Fix)** Fix image aspect ratio being changed during editing operations.
*   **[T34] (Bug Fix)** Modification prompt adds a new object instead of replacing it.
*   **[T33] (Bug Fix)** Fix "Mask creation failed" error.
*   **[T32] (Bug Fix)** The "Redo" function performs an "Undo" instead.
*   **[T31] (Bug Fix)** Fix incorrect position and scale of the transformable object box.
*   **[T30] (Documentation)** Document the coordinate system fix in DESIGN.md
*   **[T29] (Bug Fix)** Fix inconsistent background color on the left prompt panel.
*   **[T28] (UI/UX)** Simplify download button by removing the chevron icon.
*   **[T27] (New Feature)** Add downloadable session logs.
*   **[T26] (Bug Fix)** Fix persistent "Mask creation failed" error.
*   **[T25] (Bug Fix)** Fix intermittent "Mask creation failed" error and add diagnostic logging.
*   **[T24] (Bug Fix)** Fix `TypeError` on mask creation and incorrect "PASS" result in test harness.
*   **[T21] (Process Improvement)** Expand protocols for test plan cross-referencing and project board updates.
*   **[T20] (Process Improvement)** Formalize the "Dialogue & Analysis" task state protocol.
*   **[T19] (Process Improvement)** Add task categorization to the project board.
*   **[T18] (Process Improvement)** Review and refine system prompt protocols.
*   **[T17] (Process Improvement)** Make `system_prompt.md` fully transparent.
*   **[T16] (Bug Fix)** Fix test harness timeout by adding polling after `setPrompt`.
*   **[T15] (Documentation)** Document the `pollForState` pattern in `DESIGN.md`.
*   **[T14] (Bug Fix)** Re-introduce `stateRef` pattern to `App.tsx` to fix stale state in tests.
*   **[T13] (Refactor)** Revert `test-script.ts` to align with `REGRESSION_TEST_PLAN.md`.
*   **[T12] (Process Improvement)** Add explicit task management and interruption protocol.
*   **[T11] (New Feature)** Add collapsible log viewer to the main application UI.
*   **[T10] (Bug Fix)** Fix incorrect object display on selection (mask was shown instead of object).
*   **[T9] (Bug Fix)** Correct stale state bug in `handleUpload` function.
*   **[T8] (Documentation)** Create a UI Design document (`UI_DESIGN.md`).
*   **[T7] (Refactor)** Align `test-script.ts` with the independent test cases in `REGRESSION_TEST_PLAN.md`.
*   **[T6] (Documentation)** Create a formal regression test plan (`REGRESSION_TEST_PLAN.md`).
*   **[T5] (Documentation)** Refactor `DESIGN.md` to link to `PRODUCT.md` as the SSOT.
*   **[T4] (Documentation)** Create a Product Requirements Document (`PRODUCT.md`).
*   **[T3] (Process Improvement)** Create a persistent `CHANGELOG.md` for all development sessions.
*   **[T2] (Process Improvement)** Add a rule to `system_prompt.md` to enforce adherence to `DESIGN.md`.
*   **[T1] (Documentation)** Create the initial Engineering Design Document (`DESIGN.md`).
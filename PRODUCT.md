# Product Requirements Document: Banana Peel

**Version:** 1.0
**Status:** In Development
**Date:** 2023-10-27

## 1. Introduction & Vision

**Vision:** To provide a powerful, intuitive, and fun web-based tool that empowers users of all skill levels to generate and edit images using the latest advancements in generative AI. Banana Peel aims to make complex image manipulation as simple as writing a sentence.

**Problem:** Professional image editing software has a steep learning curve and can be expensive. Simpler tools often lack the power for complex edits. Banana Peel bridges this gap by offering sophisticated, AI-driven editing capabilities through a simple, conversational interface.

**Goal:** Become the go-to web application for quick, AI-powered image creation and contextual editing.

## 2. User Personas

*   **The Content Creator (Social Media Manager, Blogger):** Needs to quickly generate unique, eye-catching images for posts and articles without needing deep design skills. Wants to make quick edits like changing object colors or adding elements to existing photos.
*   **The Hobbyist / Creative Explorer:** Enjoys experimenting with AI and art. Wants a playground to bring imaginative ideas to life and explore the creative potential of generative models.
*   **The Small Business Owner:** Needs to create simple marketing materials, product mockups, or website graphics without hiring a professional designer. Wants to easily remove backgrounds or add promotional text/objects to photos.
*   **The Developer / Power User:** A user who encounters an issue and wants to provide a detailed bug report to the developers. Also, a user who may have their own Gemini API key and prefers to use it to manage their own usage and billing.

## 3. User Stories

*   **As a Content Creator,** I want to type "a photorealistic image of a cat wearing sunglasses on a beach" so that I can generate a unique hero image for my blog post.
*   **As a Small Business Owner,** I want to upload a photo of my product and add "a festive holiday background" so I can create seasonal marketing content.
*   **As a Creative Explorer,** I want to select a character in my generated image and modify it by typing "give them a wizard hat" so I can iteratively build on my creation.
*   **As a Creative Explorer,** I want to select an object and click a delete button to have the AI remove it and fill in the background, so I can clean up my composition.
*   **As any user,** I want to undo my last edit if I make a mistake, so I don't lose my work.
*   **As a Content Creator,** I want to download my final creation as a high-quality PNG file so I can use it in my social media campaigns.
*   **As a Hobbyist,** I want to select an empty part of my image and add "a flying saucer in the sky" to see how the AI blends it into the scene.
*   **As any user,** I want to click a "New Image" button to clear my canvas and start over without having to refresh the page.
*   **As a Power User,** I want to access and download the debug logs for my current session so that I can attach them to a bug report when something goes wrong.
*   **As a Power User,** I want to enter my own Gemini API key so that I can use my own API quota and manage my usage independently of the application's default key.
*   **As a Creative Explorer,** I want to view a detailed description of my image and edit that description directly, so that I can make precise, granular changes to the scene.
*   **As a Developer / Power User,** I want to inspect the full details of recent API calls, including the exact prompts and visual payloads, so I can effectively debug the application's multimodal interactions.

## 4. Feature Breakdown

This section details the core features of the Banana Peel application, now organized by the distinct "Generation" and "Editing" states.

### 4.1. "Generation" State (Initial State)

This is the application's default state when a user first arrives or starts a new image. The UI is focused exclusively on creating the initial image.

*   **4.1.1. Text-to-Image Generation:**
    *   **Description:** Users can generate a new image from scratch by entering a descriptive text prompt in the main input area.
    *   **Acceptance Criteria:**
        *   The main button is labeled "Generate Image".
        *   Clicking the button sends the prompt to the Gemini API.
        *   The generated image appears on the canvas, and the application transitions to the "Editing" state.
*   **4.1.2. Image Upload:**
    *   **Description:** Users can upload their own image (PNG, JPEG) to serve as the base for editing.
    *   **Acceptance Criteria:**
        *   An "Upload an Image" button is visible.
        *   Uploading an image displays it on the canvas, and the application transitions to the "Editing" state.

### 4.2. "Editing" State

This state is active as soon as an image is present on the canvas. The UI changes to provide a focused editing experience.

*   **4.2.1. Canvas Header & Session Controls:**
    *   **Description:** A new header appears above the main canvas area, consolidating all session-level actions.
    *   **Acceptance Criteria:**
        *   This header contains icon buttons for "Undo", "Redo", and "Download" on the left.
        *   It contains a "New Image" button on the right.
        *   All controls in this header are disabled when the user is in a sub-editing workflow (e.g., modifying an object).
*   **4.2.2. Prompting Modes:**
    *   **Description:** The prompt panel provides two modes for editing: "Freeform" and "Structured".
    *   **"Freeform" Mode (Default):**
        *   The user enters a natural language command (e.g., "make the sky blue").
        *   This mode is used for both global edits and object modifications.
    *   **"Structured" Mode:**
        *   The user can toggle to this mode.
        *   The application calls the Gemini API to generate a detailed, line-by-line description of the current image.
        *   The user can edit this textual description directly.
        *   When "Edit Image" is clicked, the application semantically compares the original and edited descriptions to identify the changes and instructs the model to apply only those changes.
        *   This mode is automatically reset to "Freeform" if the user performs an Undo or Redo.
*   **4.2.3. Contextual Object Editing Workflow:**
    *   **Description:** The core workflow of selecting an area, having the AI analyze it, and entering a context-specific "Add" or "Modify" mode.
    *   **Acceptance Criteria:**
        *   The "Upload an Image" button is hidden in this state.
        *   Dragging on the canvas selects an area and triggers the object analysis.
        *   A static, dashed-yellow box shows the user's current selection.
        *   The UI adapts to "Add" or "Modify" modes as previously defined.
        *   When in "Modify" mode, a **Trash Icon** appears. Clicking it prompts the user for confirmation and, if confirmed, removes the selected object and inpaints the background.

### 4.3. Application State & Usability

*   **4.3.1. State Feedback:**
    *   **Description:** The application provides clear visual feedback for its current state.
    *   **Acceptance Criteria:**
        *   Loading spinners and disabled buttons are used during API calls.
        *   Error messages are displayed for failed operations, including specific messages for invalid API keys.
        *   Informative text and placeholders guide the user's next action.
*   **4.3.2. API Key Management:**
    *   **Description:** A settings modal allows users to provide their own Gemini API key.
    *   **Acceptance Criteria:**
        *   A settings icon in the header opens a modal.
        *   The modal contains a password input field for the API key.
        *   The key is stored in the browser's local storage.
        *   API calls will prioritize the user's key over the default application key.
        *   The modal includes a link to instructions for obtaining an API key.
*   **4.3.3. Developer Test Harness:**
    *   **Description:** A hidden developer tool for running automated regression tests.
    *   **Acceptance Criteria:**
        *   Typing the special command `_run_test_` in the prompt box activates the Test Harness modal.
*   **4.3.4. In-App Log Viewer:**
    *   **Description:** A collapsible log viewer docked at the bottom of the screen for power users or for debugging purposes.
    *   **Acceptance Criteria:**
        *   A "Logs" bar is visible at the bottom of the screen.
        *   The viewer is not available when the Test Harness is active.
*   **4.3.5. API Call Inspector:**
    *   **Description:** A powerful debugging tool for visually inspecting the full context of recent Gemini API calls.
    *   **Acceptance Criteria:**
        *   A new "API Call Inspector" button is available in the `LogViewer`.
        *   Clicking the button opens a large modal dialog.
        *   The modal displays a list of the last 5 API calls.
        *   Selecting a call from the list shows its full details: the function name, the complete text prompt, all input images, and all output images.
        *   All displayed images have a download button, allowing the user to save them for offline analysis.

## 5. Non-Functional Requirements

*   **Performance:** API calls should feel responsive. Loading states must prevent user confusion. Client-side image processing should be efficient.
*   **Reliability:** The application should gracefully handle API errors (e.g., rate limiting) with retries and clear user feedback.
*   **Usability:** The interface must be simple, intuitive, and require no prior training.
*   **Accessibility:** All interactive elements must be keyboard-accessible and have appropriate ARIA labels.

## 6. Future Considerations (Out of Scope for V1)

*   **Multi-Object Selection:** Allow users to select and modify multiple objects simultaneously.
*   **Layer System:** Introduce a concept of layers, similar to professional editing software, for more complex compositions.
*   **Style Transfer:** Apply the artistic style of one image to another.
*   **Saving/Loading Projects:** Allow users to save their editing session, including history, and resume later.
*   **On-Screen Transform Handles:** An experimental feature was built to allow direct manipulation of selected objects with on-screen handles for position, scale, and rotation. This feature was reverted. The core architectural challenge is the mismatch between a client-side, vector-like UI state (x, y, scale) and the server-side, pixel-based reality of the generative model. Each small UI adjustment would require a new API call, leading to high latency and a poor user experience where the visual result might not perfectly match the UI handles. This can be re-evaluated as a future feature if the underlying technology evolves to better support this interaction model.
*   **Usage-Based Rate Limiting:** Limit the number of API calls a user can make with the default "app key" before prompting them to enter their own key.
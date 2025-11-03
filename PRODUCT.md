# Product Requirements Document: Banana Peel

**Version:** 1.1
**Status:** In Development
**Date:** 2023-12-08

## 1. Introduction & Vision

**Vision:** To provide a powerful, intuitive, and fun web-based tool that empowers users of all skill levels to generate and edit images using the latest advancements in generative AI. Banana Peel aims to make complex image manipulation as simple as writing a sentence.

**Problem:** Professional image editing software has a steep learning curve and can be expensive. Simpler tools often lack the power for complex edits. Banana Peel bridges this gap by offering sophisticated, AI-driven editing capabilities through a simple, conversational interface.

**Goal:** Become the go-to web application for quick, AI-powered image creation and contextual editing.

## 2. User Personas

*   **The Content Creator (Social Media Manager, Blogger):** Needs to quickly generate unique, eye-catching images for posts and articles without needing deep design skills. Wants to make quick edits like changing object colors or adding elements to existing photos.
*   **The Hobbyist / Creative Explorer:** Enjoys experimenting with AI and art. Wants a playground to bring imaginative ideas to life and explore the creative potential of generative models.
*   **The Small Business Owner:** Needs to create simple marketing materials, product mockups, or website graphics without hiring a professional designer. Wants to easily remove backgrounds or promotional text/objects to photos.
*   **The Developer / Power User:** A user who encounters an issue and wants to provide a detailed bug report to the developers. Also, a user who may have their own Gemini API key and prefers to use it to manage their own usage and billing.

## 3. User Stories

*   **As a Content Creator,** I want to type "a photorealistic image of a cat wearing sunglasses on a beach" so that I can generate a unique hero image for my blog post.
*   **As a Small Business Owner,** I want to upload a photo of my product and add "a festive holiday background" so I can create seasonal marketing content.
*   **As a Creative Explorer,** I want to select a character in my generated image and modify it by typing "give them a wizard hat" so I can iteratively build on my creation.
*   **As a Creative Explorer,** I want to select an object and click a delete button to have the AI remove it and fill in the background, so I can clean up my composition.
*   **As any user,** I want to undo my last edit if I make a mistake, so I don't lose my work.
*   **As a Content Creator,** I want to download my final creation as a high-quality PNG file so I can use it in my social media campaigns.
*   **As a Hobbyist,** I want to click an 'Add Object' button and be guided to select an area on my image, then describe "a flying saucer in the sky" to see how the AI blends it into the scene.
*   **As any user,** I want to click a "New Image" button to clear my canvas and start over without having to refresh the page.
*   **As a Power User,** I want to access and download the debug logs for my current session so that I can attach them to a bug report when something goes wrong.
*   **As a Power User,** I want to enter my own Gemini API key for my current session, so that I can use my own API quota and not worry about it being stored in my browser.
*   **As a new user,** when I first use the app, I want a limited number of free uses with the default key, so I can try out the features before needing my own key.
*   **As a new user,** after I've used up my free quota, I want to be clearly prompted to add my own API key so I can continue using the application.
*   **As a Creative Explorer,** I want to view a detailed description of my image and edit that description directly, so that I can make precise, granular changes to the scene.
*   **As a Creative Explorer,** when editing a long, structured description, I want to open an expanded, full-screen editor so I can see and edit the entire text comfortably.
*   **As a Power User,** I want to inspect the full details of recent API calls, including the exact prompts and visual payloads, so I can effectively debug the application's multimodal interactions.
*   **As any user,** if the smart object deletion fails, I want a more reliable "Force Delete" option that guarantees removal of everything in my selection, so I always have control over the editing process.
*   **As any user,** when an API call fails due to a missing key or quota issue, I want to see a clear error message in a dialog box with an option to update my API key, so I can quickly resolve the issue.

## 4. Feature Breakdown

This section details the core features of the Banana Peel application.

### 4.1. "Generation" State (Initial State)

This is the application's default state. The UI is focused exclusively on creating the initial image.

*   **4.1.1. Text-to-Image Generation:**
    *   **Description:** Users can generate a new image from scratch by entering a descriptive text prompt.
*   **4.1.2. Image Upload:**
    *   **Description:** Users can upload their own image (PNG, JPEG) to serve as the base for editing.

### 4.2. "Editing" State

This state is active as soon as an image is present on the canvas. The UI changes to provide a focused editing experience.

*   **4.2.1. Canvas Header & Session Controls:**
    *   **Description:** A header appears above the canvas with icon buttons for "Undo", "Redo", "Download", "Add Object", and a text button for "New Image".
*   **4.2.2. Prompting Modes & Expanded Editor:**
    *   **Description:** The prompt panel provides two modes for editing: "Freeform" and "Structured", with an expanded editing view for detailed work.
*   **4.2.3. Contextual Object Editing Workflow:**
    *   **Description:** The core workflow of selecting an area, having the AI analyze it, and entering a context-specific "Add" or "Modify" mode.
*   **4.2.4. Guided "Add Object" Workflow:**
    *   **Description:** An explicit workflow for adding objects to the canvas, initiated by the user via the '+' icon.

### 4.3. Application State & Usability

*   **4.3.1. State Feedback & Error Handling:**
    *   **Description:** The application provides clear visual feedback for its current state, including a unified system for handling API errors.
    *   **Acceptance Criteria:**
        *   Loading spinners and disabled buttons are used during API calls.
        *   All API errors (e.g., invalid key, quota exceeded, server error) are displayed in a dedicated `ErrorModal`.
        *   The `ErrorModal` shows the specific error message and provides two actions: "Cancel" (to dismiss) and "Update API Key" (to open the Settings modal).
*   **4.3.2. API Key Management & Rate Limiting:**
    *   **Description:** The application provides a limited number of free uses with a default key and allows users to provide their own key for extended use.
    *   **Acceptance Criteria:**
        *   A settings icon in the header opens a modal for API key management.
        *   **Session-Only Keys:** User-provided keys are stored in memory for the current session only and are **not** persisted in `localStorage`.
        *   **Default Key Rate Limiting:**
            *   Users get 6 free API calls using the default application key.
            *   This usage count **is** persisted in `localStorage` across sessions.
            *   The `SettingsModal` displays the number of remaining free uses.
            *   Once the limit is reached, or if the default key's global quota is exhausted, any action requiring an API call will trigger the `ErrorModal` with a specific message guiding the user to enter their own key.
*   **4.3.3. Developer Tools:**
    *   **Test Harness:** A hidden developer tool for running automated regression tests, activated by a special command.
    *   **Log Viewer & API Inspector:** A collapsible log viewer with an integrated "API Call Inspector" for visually debugging API interactions.

## 5. Non-Functional Requirements

*   **Performance:** API calls should feel responsive. Loading states must prevent user confusion.
*   **Reliability:** The application should gracefully handle API errors with retries and clear user feedback.
*   **Usability:** The interface must be simple, intuitive, and require no prior training.
*   **Accessibility:** All interactive elements must be keyboard-accessible and have appropriate ARIA labels.

## 6. Future Considerations (Out of Scope for V1)

*   **Multi-Object Selection:** Allow users to select and modify multiple objects simultaneously.
*   **Layer System:** Introduce a concept of layers, similar to professional editing software.
*   **Saving/Loading Projects:** Allow users to save their editing session, including history.
*   **On-Screen Transform Handles:** An experimental feature was reverted due to architectural challenges. The core issue is the latency and potential mismatch between a client-side vector-like UI state and the server-side, pixel-based reality of the generative model. This can be re-evaluated if underlying technology evolves.
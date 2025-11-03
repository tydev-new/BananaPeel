# Banana Peel: Precision AI Image Editing

<!-- TODO: Add a compelling animated GIF of the application in action. -->

Banana Peel is a web-based, AI-powered image generation and editing tool. It is an exploration into solving the "last 20%" problem in generative AI by combining the power of Google's Gemini models with deterministic, client-side code and advanced prompt engineering.

## 1. The "Last 20%" Problem: Why Precise AI Editing is Hard

This project was born from a real-world challenge: creating a book cover for my mother-in-law's memoir in just two days using the incredibly powerful `gemini-2.5-flash-image` model.

It quickly became apparent that while simple text prompts could get me **80%** of the way to the desired result, achieving the final vision required more precision.

- To get **90%** of what I wanted, I had to move beyond simple prompts and use highly structured, procedural instructions.
- To get **95%** there, I still needed to perform manual, pixel-level edits in a traditional photo editor.

Why is that last fraction so difficult? It stems from a fundamental difference between traditional editing software and generative AI models.

A traditional tool like Adobe Illustrator or Figma operates on a **vector-based, object-oriented model**. It understands "a red square" as a distinct object with properties like `fill: #FF0000`, `width: 50px`, and `position: (x, y)`. A command like "move it 10 pixels to the left" is a simple, deterministic mathematical operation.

A generative AI model, however, operates on a **pixel-based, probabilistic model**. It doesn't "see" a red square; it sees a pattern of pixels that it has learned to associate with the concept of a "red square". A command like "move it to the left" requires the model to regenerate a vast field of pixels in a way that *probably* looks like the square has moved. This process is not deterministic and makes precise, iterative edits incredibly challenging. Banana Peel is an attempt to solve this "last 20%" problem.

## 2. How Banana Peel Works: A Hybrid Approach

Banana Peel tackles the precision problem by not relying on a single AI call. Instead, it employs a sophisticated, multi-step architecture that combines specialized AI models with reliable, deterministic client-side code.

### Breaking Down Complex Problems

A core principle of Banana Peel is to break down complex user requests into smaller, simpler, and less ambiguous steps. A prime example is our **"Smart Pre-processor / Dumb Executor"** architecture for object modification.

Instead of asking a single model to both interpret a command like "make it a blue star and move it a little to the left" and perform the edit, we:
1.  **First,** send the user's raw text to a specialized text model (`gemini-2.5-flash`) with a prompt that turns it into an "expert instruction interpreter." This model resolves all ambiguity and outputs a clean, structured JSON object.
2.  **Then,** we pass that unambiguous JSON instruction to the image model (`gemini-2.5-flash-image`) with a simple, procedural prompt that tells it to just execute the instructions.

This separation of concerns—letting the text model handle language and the image model handle pixels—dramatically improves the reliability of complex edits.

### Combining AI with Deterministic Code

We leverage AI for tasks that require creative interpretation but use traditional, deterministic code for tasks that demand 100% reliability. Our object deletion workflow is the perfect example:

1.  **AI-Powered Mask Generation:** We first send the cropped object to `gemini-2.5-flash-image` with a prompt asking it to generate a high-fidelity silhouette mask. This is a creative task where the AI excels.
2.  **Client-Side Cleaning & Validation:** The AI's output isn't always perfect. So, we then run the generated mask through a series of deterministic, client-side JavaScript functions:
    *   `binarizeMask`: Programmatically removes any gray pixels to ensure the mask is pure black and white.
    *   `scaleImage`: Resizes the mask to the exact dimensions of the user's selection.
    *   `analyzeMask`: Validates that the mask isn't empty, with a guaranteed fallback to a simple box mask if it is.

This hybrid approach gives us the best of both worlds: the creative power of generative AI and the rock-solid reliability of traditional code.

## 3. Features

*   **Text-to-Image Generation:** Create images from scratch with a descriptive prompt.
*   **Contextual Image Editing:** Upload your own image and modify it using either freeform or structured text prompts.
*   **Precise Object Selection:** Select objects or areas on the canvas to perform targeted modifications, including:
    *   **Modify:** Change an object's color, shape, scale, location, or rotation.
    *   **Add:** Add entirely new objects to a selected area.
    *   **Delete:** Intelligently remove objects and have the AI realistically fill in the background.
*   **Robust Undo/Redo History:** Navigate through your editing history with multi-level undo and redo.
*   **Developer Tools:**
    *   **Log Viewer:** A real-time log of application events.
    *   **API Call Inspector:** A visual "flight recorder" to inspect the exact inputs and outputs of every Gemini API call.
*   **Session-Only API Key Management:** Provide your own API key for the current session, ensuring privacy and security as it's never stored permanently.
*   **Default Key Rate Limiting:** Try out the app with 6 free uses on the default key before needing to provide your own.

## 4. Getting Started (Local Development)

To run Banana Peel on your local machine, follow these steps:

1.  **Clone the Repository**
    ```bash
    # Replace with your actual repository URL
    git clone https://github.com/your-username/banana-peel.git
    cd banana-peel
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Set Up Your Environment**
    *   Create a new file named `.env` in the root of the project.
    *   Add your Google Gemini API key to this file:
        ```
        GEMINI_API_KEY="your-api-key-here"
        ```
    *   You can get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```

5.  **Open in Browser**
    *   Navigate to `http://localhost:3000` in your web browser.
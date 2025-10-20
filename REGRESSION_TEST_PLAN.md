# Regression Test Plan: Banana Peel Core Functionality

**Version:** 1.0
**Date:** 2023-10-27

## 1. Objective

To verify the core features of the Banana Peel application, including object selection, content modification, structural modification (move/scale), multi-action prompts, adding new objects, removing objects, and undo/redo functionality. This document outlines the manual execution script for regression testing.

## 2. Test Setup: The Initial Image

Before starting, the test harness will programmatically generate a 512x512 pixel PNG image (`shapes.png`) with a predictable state. This image serves as the baseline for all test cases and contains:
*   A plain white background.
*   A 50x50 pixel **red square** positioned in the top-left quadrant.
*   A 50-pixel diameter **blue circle** positioned in the exact center.
*   A 50x50 pixel **green equilateral triangle** positioned in the bottom-right quadrant.

This consistent starting state is crucial for validating the outcomes of each independent test case.

---

## 3. Test Execution Script

Each test case below is designed to be **fully independent**. Each test begins by resetting the application state and uploading the `shapes.png` image.

### Test Case 1: Simple Content Change (Color)

*   **Objective:** Verify that the color of a selected object can be changed without affecting the rest of the image.
*   **Action Steps:**
    1.  **Setup:** Launch the application and upload `shapes.png`.
    2.  **Select:** Click and drag a selection box precisely around the **red square**.
    3.  **Validate Selection:**
        *   **Immediate:** The "Modifying object" panel must appear.
        *   **Success Criteria:** The object description must contain "red square". If not, the test fails immediately.
    4.  **Prompt:** In the prompt box, type: `make it purple`.
    5.  **Execute:** Click the "Apply Modification" button.
*   **Expected Final Validation:**
    *   The image now displays a **purple square** in the top-left.
    *   The blue circle and green triangle are unchanged and in their original positions.
    *   The background where the red square was is clean and white (successful inpainting).

### Test Case 2: Structural Change (Resizing)

*   **Objective:** Verify that the size of a selected object can be changed.
*   **Action Steps:**
    1.  **Setup:** Launch the application and upload `shapes.png`.
    2.  **Select:** Click and drag a selection box precisely around the **blue circle**.
    3.  **Validate Selection:**
        *   **Immediate:** The "Modifying object" panel must appear.
        *   **Success Criteria:** The object description must contain "blue circle". If not, the test fails immediately.
    4.  **Prompt:** In the prompt box, type: `make it twice as large`.
    5.  **Execute:** Click "Apply Modification".
*   **Expected Final Validation:**
    *   The image now displays a larger blue circle in the center (approx. 100-pixel diameter).
    *   The red square and green triangle are unchanged.

### Test Case 3: Structural Change (Moving)

*   **Objective:** Verify that a selected object can be moved to a new location.
*   **Action Steps:**
    1.  **Setup:** Launch the application and upload `shapes.png`.
    2.  **Select:** Click and drag a selection box precisely around the **green triangle**.
    3.  **Validate Selection:**
        *   **Immediate:** The "Modifying object" panel must appear.
        *   **Success Criteria:** The object description must contain "green triangle". If not, the test fails immediately.
    4.  **Prompt:** In the prompt box, type: `move it to the top right corner`.
    5.  **Execute:** Click "Apply Modification".
*   **Expected Final Validation:**
    *   The green triangle is now in the top-right corner of the image.
    *   The bottom-right corner, where the triangle used to be, is now a clean white background.
    *   The red square and blue circle are unchanged.

### Test Case 4: Multi-Action Prompt (Modify, Scale, and Move)

*   **Objective:** Verify that the AI can interpret and execute a complex prompt involving multiple simultaneous changes.
*   **Action Steps:**
    1.  **Setup:** Launch the application and upload `shapes.png`.
    2.  **Select:** Click and drag a selection box precisely around the **red square**.
    3.  **Validate Selection:**
        *   **Immediate:** The "Modifying object" panel must appear.
        *   **Success Criteria:** The object description must contain "red square". If not, the test fails immediately.
    4.  **Prompt:** In the prompt box, type: `turn it into a yellow star, make it smaller, and move it to the bottom left corner`.
    5.  **Execute:** Click "Apply Modification".
*   **Expected Final Validation:**
    *   A small **yellow star** now appears in the bottom-left corner.
    *   The top-left corner, where the red square was, is now a clean white background.
    *   The blue circle and green triangle are unchanged.

### Test Case 5: Adding a New Object

*   **Objective:** Verify that selecting an empty area allows a new object to be added.
*   **Action Steps:**
    1.  **Setup:** Launch the application and upload `shapes.png`.
    2.  **Select:** Click and drag a selection box in the empty **top-right corner**.
    3.  **Validate Selection:**
        *   **Immediate:** The UI must switch to "Add Object" mode.
        *   **Success Criteria:** The API response for the selection must have been "background". If the app enters "Modify" mode, the test fails immediately.
    4.  **Prompt:** In the prompt box, type: `a black octagon`.
    5.  **Execute:** Click "Add Object".
*   **Expected Final Validation:**
    *   A **black octagon** now appears in the top-right corner.
    *   All original shapes (red square, blue circle, green triangle) are unchanged.

### Test Case 6: Removing an Object

*   **Objective:** Verify that an object can be removed from the image, with the background correctly inpainted.
*   **Action Steps:**
    1.  **Setup:** Launch the application and upload `shapes.png`.
    2.  **Select:** Click and drag a selection box around the **blue circle** in the center.
    3.  **Validate Selection:**
        *   **Immediate:** The "Modifying object" panel must appear.
        *   **Success Criteria:** The object description must contain "blue circle". If not, the test fails immediately.
    4.  **Prompt:** In the prompt box, type: `remove it`.
    5.  **Execute:** Click "Apply Modification".
*   **Expected Final Validation:**
    *   The blue circle is gone. The center of the canvas is a clean white background.
    *   All other shapes remain in their original positions.

### Test Case 7: Undo and Redo Functionality

*   **Objective:** Verify that the undo and redo actions correctly navigate the image history.
*   **Action Steps:**
    1.  **Setup:** Launch the application and upload `shapes.png`. The history index should be `0`.
    2.  **Action:** Perform the actions from "Test Case 1" (select red square, prompt "make it purple", execute).
    3.  **Validate Action:** The image should show a purple square. The history index should now be `1`.
    4.  **Undo:** Click the **Undo** button.
    5.  **Validate Undo:**
        *   The image must revert to the original `shapes.png` (with a red square).
        *   The history index must be `0`.
    6.  **Redo:** Click the **Redo** button.
    7.  **Validate Redo:**
        *   The image must show the purple square again.
        *   The history index must be `1`.

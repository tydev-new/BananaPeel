import { BoundingBox } from '../types';
import { TestCase, TestContext } from './types';

const TIMEOUT = 60000; // 60 seconds for API calls
const POLL_INTERVAL = 500;

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
};

const pollForState = async (
  context: TestContext,
  predicate: (state: ReturnType<TestContext['handles']['getState']>) => boolean,
  description: string,
  timeout = TIMEOUT
) => {
  const { handles, log } = context;
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const state = handles.getState();
    if (predicate(state)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
  log(`DEBUG: Final state before timeout: ${JSON.stringify(handles.getState(), null, 2)}`);
  throw new Error(`Timeout: Waited ${timeout/1000}s for "${description}" but the condition was not met.`);
};

// Define common selection boxes for reuse
const RED_SQUARE_BOX: BoundingBox = { x: 100, y: 100, width: 56, height: 56 };
const BLUE_CIRCLE_BOX: BoundingBox = { x: 228, y: 228, width: 56, height: 56 };
const GREEN_TRIANGLE_BOX: BoundingBox = { x: 356, y: 356, width: 56, height: 56 };
const TOP_RIGHT_EMPTY_BOX: BoundingBox = { x: 400, y: 50, width: 80, height: 80 };


export const REGRESSION_TEST_PLAN: TestCase[] = [
    {
        name: 'Test Case 1: Simple Content Change (Color)',
        run: async (context) => {
            const { handles, log, assets } = context;
            handles.setLogger(log);
            handles.reset();
            
            log('  - STEP: Upload shapes.png');
            await handles.upload(assets.shapesFile);
            await pollForState(context, s => s.history.length === 1 && !s.isLoading, "Image to be uploaded");
            log('  - VALIDATION: Image uploaded successfully.');

            log('  - STEP: Select red square');
            await handles.select(RED_SQUARE_BOX);
            // FIX: Strengthen assertion to check for selectable object creation.
            await pollForState(context, s => !s.isLoading && s.editMode === 'modify' && s.selectableObjects.length === 1, "Red square to be selected and analyzed");
            
            const stateAfterSelect = handles.getState();
            assert(stateAfterSelect.originalObjectDescription?.includes('red square'), `Expected "red square", got "${stateAfterSelect.originalObjectDescription}"`);
            log(`  - VALIDATION: "Modifying object" panel appeared for "${stateAfterSelect.originalObjectDescription}".`);

            const prompt = 'make it purple';
            log(`  - STEP: Set prompt to "${prompt}"`);
            handles.setPrompt(prompt);
            await pollForState(context, s => s.prompt === prompt, 'prompt to be updated');

            log('  - STEP: Apply modification');
            await handles.generate();
            await pollForState(context, s => !s.isLoading && s.history.length === 2, "Modification to apply");

            const finalState = handles.getState();
            assert(finalState.error === null, `Expected no error, got: ${finalState.error}`);
            assert(finalState.editMode === null, 'Edit mode should be cleared after modification');
        },
    },
    {
        name: 'Test Case 2: Structural Change (Resizing)',
        run: async (context) => {
            const { handles, log, assets } = context;
            handles.setLogger(log);
            handles.reset();
            await handles.upload(assets.shapesFile);
            await pollForState(context, s => s.history.length === 1 && !s.isLoading, "Image to be uploaded for resizing test");
            
            log('  - STEP: Select blue circle');
            await handles.select(BLUE_CIRCLE_BOX);
            // FIX: Strengthen assertion to check for selectable object creation.
            await pollForState(context, s => !s.isLoading && s.editMode === 'modify' && s.selectableObjects.length === 1, "Blue circle to be selected and analyzed");
            const stateAfterSelect = handles.getState();
            assert(stateAfterSelect.originalObjectDescription?.includes('blue circle'), `Expected "blue circle", got "${stateAfterSelect.originalObjectDescription}"`);
            log(`  - VALIDATION: "Modifying object" panel appeared for "${stateAfterSelect.originalObjectDescription}".`);

            const prompt = 'make it twice as large';
            log(`  - STEP: Set prompt to "${prompt}"`);
            handles.setPrompt(prompt);
            await pollForState(context, s => s.prompt === prompt, 'prompt to be updated');
            
            log('  - STEP: Apply modification');
            await handles.generate();
            await pollForState(context, s => !s.isLoading && s.history.length === 2, "Resizing to apply");
            
            assert(handles.getState().error === null, 'Resize should not produce an error');
        },
    },
    {
        name: 'Test Case 3: Structural Change (Moving)',
        run: async (context) => {
            const { handles, log, assets } = context;
            handles.setLogger(log);
            handles.reset();
            await handles.upload(assets.shapesFile);
            await pollForState(context, s => s.history.length === 1 && !s.isLoading, "Image to be uploaded for moving test");
            
            log('  - STEP: Select green triangle');
            await handles.select(GREEN_TRIANGLE_BOX);
            // FIX: Strengthen assertion to check for selectable object creation.
            await pollForState(context, s => !s.isLoading && s.editMode === 'modify' && s.selectableObjects.length === 1, "Green triangle to be selected and analyzed");
            const stateAfterSelect = handles.getState();
            assert(stateAfterSelect.originalObjectDescription?.includes('green triangle'), `Expected "green triangle", got "${stateAfterSelect.originalObjectDescription}"`);
            log(`  - VALIDATION: "Modifying object" panel appeared for "${stateAfterSelect.originalObjectDescription}".`);

            const prompt = 'move it to the top right corner';
            log(`  - STEP: Set prompt to "${prompt}"`);
            handles.setPrompt(prompt);
            await pollForState(context, s => s.prompt === prompt, 'prompt to be updated');
            
            log('  - STEP: Apply modification');
            await handles.generate();
            await pollForState(context, s => !s.isLoading && s.history.length === 2, "Move to apply");
            
            assert(handles.getState().error === null, 'Move should not produce an error');
        },
    },
    {
        name: 'Test Case 4: Multi-Action Prompt',
        run: async (context) => {
            const { handles, log, assets } = context;
            handles.setLogger(log);
            handles.reset();
            await handles.upload(assets.shapesFile);
            await pollForState(context, s => s.history.length === 1 && !s.isLoading, "Image to be uploaded for multi-action test");
            
            log('  - STEP: Select red square');
            await handles.select(RED_SQUARE_BOX);
            // FIX: Strengthen assertion to check for selectable object creation.
            await pollForState(context, s => !s.isLoading && s.editMode === 'modify' && s.selectableObjects.length === 1, "Red square to be selected and analyzed");
            const stateAfterSelect = handles.getState();
            assert(stateAfterSelect.originalObjectDescription?.includes('red square'), `Expected "red square", got "${stateAfterSelect.originalObjectDescription}"`);
            log(`  - VALIDATION: "Modifying object" panel appeared for "${stateAfterSelect.originalObjectDescription}".`);

            const prompt = 'turn it into a yellow star, make it smaller, and move it to the bottom left corner';
            log(`  - STEP: Set prompt to "${prompt}"`);
            handles.setPrompt(prompt);
            await pollForState(context, s => s.prompt === prompt, 'prompt to be updated');
            
            log('  - STEP: Apply modification');
            await handles.generate();
            await pollForState(context, s => !s.isLoading && s.history.length === 2, "Multi-action to apply");
            
            assert(handles.getState().error === null, 'Multi-action should not produce an error');
        },
    },
    {
        name: 'Test Case 5: Adding a New Object',
        run: async (context) => {
            const { handles, log, assets } = context;
            handles.setLogger(log);
            handles.reset();
            await handles.upload(assets.shapesFile);
            await pollForState(context, s => s.history.length === 1 && !s.isLoading, "Image to be uploaded for add object test");
            
            log('  - STEP: Select empty top-right corner');
            await handles.select(TOP_RIGHT_EMPTY_BOX);
            await pollForState(context, s => !s.isLoading && s.editMode === 'add', "Empty corner to be selected and analyzed as background");
            log('  - VALIDATION: UI switched to "Add Object" mode.');
            
            const prompt = 'a black octagon';
            log(`  - STEP: Set prompt to "${prompt}"`);
            handles.setPrompt(prompt);
            await pollForState(context, s => s.prompt === prompt, 'prompt to be updated');
            
            log('  - STEP: Add object');
            await handles.generate();
            await pollForState(context, s => !s.isLoading && s.history.length === 2, "Add object to apply");
            
            assert(handles.getState().error === null, 'Add object should not produce an error');
        },
    },
    {
        name: 'Test Case 6: Removing an Object',
        run: async (context) => {
            const { handles, log, assets } = context;
            handles.setLogger(log);
            handles.reset();
            await handles.upload(assets.shapesFile);
            await pollForState(context, s => s.history.length === 1 && !s.isLoading, "Image to be uploaded for remove object test");

            log('  - STEP: Select blue circle');
            await handles.select(BLUE_CIRCLE_BOX);
            // FIX: Strengthen assertion to check for selectable object creation.
            await pollForState(context, s => !s.isLoading && s.editMode === 'modify' && s.selectableObjects.length === 1, "Blue circle to be selected and analyzed");
            const stateAfterSelect = handles.getState();
            assert(stateAfterSelect.originalObjectDescription?.includes('blue circle'), `Expected "blue circle", got "${stateAfterSelect.originalObjectDescription}"`);
            log(`  - VALIDATION: "Modifying object" panel appeared for "${stateAfterSelect.originalObjectDescription}".`);
            
            const prompt = 'remove it';
            log(`  - STEP: Set prompt to "${prompt}"`);
            handles.setPrompt(prompt);
            await pollForState(context, s => s.prompt === prompt, 'prompt to be updated');
            
            log('  - STEP: Apply modification');
            await handles.generate();
            await pollForState(context, s => !s.isLoading && s.history.length === 2, "Remove object to apply");
            
            assert(handles.getState().error === null, 'Remove object should not produce an error');
        },
    },
    {
        name: 'Test Case 7: Undo and Redo',
        run: async (context) => {
            const { handles, log, assets } = context;
            handles.setLogger(log);
            handles.reset();
            await handles.upload(assets.shapesFile);
            await pollForState(context, s => s.historyIndex === 0 && s.history.length === 1, "Image to be uploaded for undo/redo test");
            log('  - SETUP: Initial image is loaded. History index is 0.');
            
            log('  - ACTION: Select red square and change to purple');
            await handles.select(RED_SQUARE_BOX);
            // FIX: Strengthen assertion to check for selectable object creation.
            await pollForState(context, s => s.editMode === 'modify' && s.selectableObjects.length === 1, "Red square to be selected");

            const prompt = 'make it purple';
            handles.setPrompt(prompt);
            await pollForState(context, s => s.prompt === prompt, 'prompt to be updated');

            await handles.generate();
            await pollForState(context, s => s.historyIndex === 1 && s.history.length === 2, "Modification to apply");
            log('  - VALIDATION: Modification complete. History index is 1.');

            log('  - STEP: Click Undo button');
            handles.undo();
            await pollForState(context, s => s.historyIndex === 0, "Undo to revert modification");
            assert(handles.getState().history.length === 2, 'History length should remain 2 after undo');
            log('  - VALIDATION: Undo successful. History index is now 0.');

            log('  - STEP: Click Redo button');
            handles.redo();
            await pollForState(context, s => s.historyIndex === 1, "Redo to re-apply modification");
            assert(handles.getState().history.length === 2, 'History length should remain 2 after redo');
            log('  - VALIDATION: Redo successful. History index is now 1.');
        },
    },
];
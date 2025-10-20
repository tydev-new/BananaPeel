import React, { useState, useCallback, useRef, useEffect } from 'react';
import { REGRESSION_TEST_PLAN } from '../test/test-script';
import { AppTestHandles, TestStatus } from '../test/types';
import { createShapesImageFile } from '../assets/shapes';
import { LoadingSpinner } from './icons';
import { logger, LogLevel } from '../utils/logger';

interface TestHarnessProps {
  onExit: () => void;
  handles: AppTestHandles;
  debugImageUrl: string | null;
}

const SOURCE = 'TestHarness';

const TestHarness: React.FC<TestHarnessProps> = ({ onExit, handles, debugImageUrl }) => {
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>(
    () => Object.fromEntries(REGRESSION_TEST_PLAN.map(tc => [tc.name, 'pending']))
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy Logs');
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.INFO);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logger.setLevel(logLevel);
  }, [logLevel]);

  useEffect(() => {
    if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const log = useCallback((message: string) => {
    // This function is the "output" for the logger service.
    // The logger service itself handles formatting and level checking.
    setLogs(prev => [...prev, message]);
  }, []);

  // Connect our UI's log function to the logger service's output
  useEffect(() => {
    handles.setLogger(log);
  }, [log, handles]);

  const runTests = useCallback(async () => {
    setIsRunning(true);
    setLogs([]);
    setTestStatuses(Object.fromEntries(REGRESSION_TEST_PLAN.map(tc => [tc.name, 'pending'])));

    logger.info(SOURCE, '--- Starting Regression Test Suite ---');
    
    let shapesFile: File;
    try {
        logger.info(SOURCE, 'SETUP: Generating initial test image (shapes.png)...');
        shapesFile = await createShapesImageFile();
        logger.info(SOURCE, 'SETUP: Image generated successfully.');
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        logger.error(SOURCE, `FATAL: Failed to create test image. ${errorMsg}`);
        setIsRunning(false);
        return;
    }

    for (const testCase of REGRESSION_TEST_PLAN) {
      setTestStatuses(prev => ({ ...prev, [testCase.name]: 'running' }));
      logger.info(SOURCE, `\n--- Running Test Case: ${testCase.name} ---`);
      
      let testPassed = true;

      try {
        await testCase.run({ handles, log, assets: { shapesFile } });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        logger.error(SOURCE, `Test Case Failed: ${errorMsg}`);
        testPassed = false;
      }

      setTestStatuses(prev => ({
        ...prev,
        [testCase.name]: testPassed ? 'passed' : 'failed',
      }));
      logger.info(SOURCE, `--- Result: ${testPassed ? 'PASSED' : 'FAILED'} ---`);
      if (!testPassed) break;
    }

    logger.info(SOURCE, '\n--- Regression Test Suite Finished ---');
    setIsRunning(false);
  }, [handles, log]);
  
  const handleRunClick = () => {
    // Reset is called within the test script now to ensure logger is set correctly
    runTests();
  }

  const handleCopyLogs = () => {
    const logText = logs.join('\n');
    navigator.clipboard.writeText(logText).then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy Logs'), 2000);
    }).catch(err => {
        console.error('Failed to copy logs: ', err);
        logger.error(SOURCE, 'Failed to copy logs to clipboard.');
    });
  };

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'passed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };
  
  const getStatusIcon = (status: TestStatus) => {
    switch(status) {
      case 'passed': return '✓';
      case 'failed': return '✗';
      case 'running': return <LoadingSpinner className="w-3 h-3 inline-block" />;
      default: return '•';
    }
  }

  const handleLogLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogLevel(e.target.value as LogLevel);
  }

  return (
    <div className="absolute inset-0 bg-gray-900 bg-opacity-90 z-40 flex items-center justify-center p-8">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-yellow-300">Regression Test Harness</h2>
          <div className="space-x-2">
            <button
                onClick={handleRunClick}
                disabled={isRunning}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md text-sm font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {isRunning ? 'Running...' : 'Run All Tests'}
            </button>
            <button
                onClick={handleCopyLogs}
                disabled={isRunning || logs.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
                {copyButtonText}
            </button>
            <button
                onClick={onExit}
                disabled={isRunning}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md text-sm font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                Exit Test Mode
            </button>
          </div>
        </div>
        <div className="flex flex-grow overflow-hidden">
          <div className="w-1/3 border-r border-gray-700 p-4 overflow-y-auto">
            <h3 className="font-semibold mb-2">Test Cases</h3>
            <ul className="mb-4">
              {REGRESSION_TEST_PLAN.map(tc => (
                <li key={tc.name} className={`text-sm mb-1 ${getStatusColor(testStatuses[tc.name])}`}>
                  <span className="inline-block w-4 mr-1 text-center">{getStatusIcon(testStatuses[tc.name])}</span>
                  {tc.name}
                </li>
              ))}
            </ul>
            <div className="mb-4 pt-4 border-t border-gray-700">
                <h3 className="font-semibold mb-2 text-gray-300">Log Level</h3>
                <div className="flex space-x-4 text-sm">
                    {/* FIX: Cast Object.values to LogLevel[] to fix typing errors with `map`. */}
                    {(Object.values(LogLevel) as LogLevel[]).filter(l => l !== LogLevel.NONE).map(level => (
                        <label key={level} className="flex items-center space-x-1 cursor-pointer">
                            <input
                                type="radio"
                                name="logLevel"
                                value={level}
                                checked={logLevel === level}
                                onChange={handleLogLevelChange}
                                className="form-radio h-4 w-4 text-yellow-500 bg-gray-700 border-gray-600 focus:ring-yellow-500"
                            />
                            <span className="capitalize">{level.toLowerCase()}</span>
                        </label>
                    ))}
                </div>
            </div>
             <div className="pt-4 border-t border-gray-700">
                <h3 className="font-semibold mb-2 text-gray-300">Last Cropped Selection</h3>
                <div className="bg-gray-900 p-2 rounded-md border border-gray-600 aspect-square flex items-center justify-center">
                    {debugImageUrl ? (
                        <img src={debugImageUrl} alt="Debug Cropped Selection" className="w-full h-auto object-contain" />
                    ) : (
                        <p className="text-gray-500 text-xs text-center">Waiting for a selection to be made in a test...</p>
                    )}
                </div>
            </div>
          </div>
          <div ref={logsContainerRef} className="w-2/3 p-4 bg-gray-900 overflow-y-auto font-mono text-xs">
            {logs.map((logMsg, i) => (
              <p key={i} className={`whitespace-pre-wrap ${logMsg.includes('[ERROR]') || logMsg.includes('FAILED') ? 'text-red-400' : logMsg.includes('PASSED') ? 'text-green-400' : logMsg.includes('[WARN]') ? 'text-yellow-400' : 'text-gray-300'}`}>
                {logMsg}
              </p>
            ))}
             {isRunning && <LoadingSpinner className="w-4 h-4 text-yellow-400 mt-2" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestHarness;
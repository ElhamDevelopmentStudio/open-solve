"use client";

import { useState } from "react";
import { Play, CheckCircle2, XCircle } from "@/components/icons";

const problemCode = `// Two Sum
// Given an array of integers, return indices of
// the two numbers that add up to target.

function twoSum(nums, target) {
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    
    map.set(nums[i], i);
  }
  
  return [];
}`;

const testCases = [
  { input: "[2,7,11,15], target = 9", output: "[0,1]", passed: true },
  { input: "[3,2,4], target = 6", output: "[1,2]", passed: true },
  { input: "[3,3], target = 6", output: "[0,1]", passed: true },
];

export const SplitEditor = () => {
  const [running, setRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setShowResults(true);
    }, 1500);
  };

  return (
    <div className="grid h-full gap-px overflow-hidden bg-border lg:grid-cols-2">
      <div className="bg-background p-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-mono text-sm font-bold text-primary">PROBLEM</h3>
          <span className="font-mono text-xs text-muted-foreground">Two Sum</span>
        </div>
        <pre className="overflow-x-auto font-mono text-sm leading-relaxed text-foreground">
          {problemCode}
        </pre>
      </div>

      <div className="bg-background p-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-mono text-sm font-bold text-primary">RESULTS</h3>
          <button
            onClick={handleRun}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-none border border-border bg-accent px-4 py-2 font-mono text-xs font-medium text-foreground transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {running ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Run Tests
              </>
            )}
          </button>
        </div>

        {showResults ? (
          <div className="space-y-3">
            {testCases.map((test, idx) => (
              <div key={idx} className="rounded-none border border-border bg-accent p-4">
                <div className="mb-2 flex items-center gap-2 font-mono text-xs text-foreground">
                  {test.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span>Test Case {idx + 1}</span>
                </div>
                <div className="space-y-1 font-mono text-xs text-muted-foreground">
                  <div>Input: {test.input}</div>
                  <div>Output: {test.output}</div>
                </div>
              </div>
            ))}
            <div className="mt-4 rounded-none border border-primary/50 bg-primary/10 p-4 text-center font-mono text-sm font-bold text-primary shadow-inner shadow-primary/5">
              ✓ All tests passed · 3/3 · 12ms
            </div>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center font-mono text-sm text-muted-foreground">
            Click &quot;Run Tests&quot; to execute
          </div>
        )}
      </div>
    </div>
  );
};

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Play, Pause, RotateCcw, BarChart3, Settings, Database, Activity, 
  TrendingUp, BookOpen, Award, Copy, Download, Cpu, 
  ArrowRight, ShieldAlert, Zap, History, FileSpreadsheet, RefreshCw
} from "lucide-react";

// Custom Github Icon (removed from newer lucide-react versions)
const Github = ({ size = 15 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.26 1.23-.26 1.85v4" />
  </svg>
);

const getAlgoDisplayName = (algo: string): string => {
  const names: Record<string, string> = {
    quicksort: "QuickSort",
    mergesort: "MergeSort",
    heapsort: "HeapSort",
    quick_insertion: "Quick + Insertion",
    quick_merge: "Quick + Merge",
    introsort: "Introsort"
  };
  return names[algo] || algo;
};
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

// API Base URL
const API_URL = "http://127.0.0.1:8000/api";

interface DatasetMetrics {
  sortedness: number;
  duplicate_ratio: number;
  inversion_count: number;
  distribution_type: string;
  recommended_hybrid: string;
  recommendation_reason: string;
}

interface BenchmarkResult {
  algorithm: string;
  dataset: string;
  size: number;
  threshold: number;
  pivot_strategy: string;
  runs: number;
  execution_time_ms: number;
  comparisons: number;
  swaps: number;
  max_depth: number;
  insertion_sort_triggers: number;
  heapsort_fallbacks: number;
  partition_balance: number;
  memory_usage_bytes: number;
  seed: number;
  dataset_metrics: DatasetMetrics;
}

interface HistoryItem {
  id: string;
  date: string;
  dataset: string;
  size: number;
  algorithm: string;
  runtime_ms: number;
  comparisons: number;
  swaps: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"overview" | "benchmark" | "visualizer" | "analysis">("overview");

  // ── STATE: Benchmark Lab ──
  const [datasetType, setDatasetType] = useState<string>("random");
  const [sizeExponent, setSizeExponent] = useState<number>(3); // 10^3 = 1,000. Can range 2 to 6.
  const [selectedAlgos, setSelectedAlgos] = useState<string[]>([
    "quicksort", "mergesort", "heapsort", "quick_insertion", "quick_merge", "introsort"
  ]);
  const [threshold, setThreshold] = useState<number>(16);
  const [pivotStrategy, setPivotStrategy] = useState<string>("median_of_three");
  const [timingRuns, setTimingRuns] = useState<number>(5);
  const [seed, setSeed] = useState<number>(42);
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);

  const [benchResults, setBenchResults] = useState<BenchmarkResult[]>([]);
  const [benchLoading, setBenchLoading] = useState<boolean>(false);
  const [benchError, setBenchError] = useState<string | null>(null);

  // ── STATE: Local Run History ──
  const [runHistory, setRunHistory] = useState<HistoryItem[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sorting_history");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Ignore parsing errors
        }
      }
    }
    return [];
  });

  const saveToHistory = (resultsToAdd: BenchmarkResult[]) => {
    const updated = [...runHistory];
    resultsToAdd.forEach(r => {
      updated.unshift({
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toLocaleTimeString(),
        dataset: r.dataset,
        size: r.size,
        algorithm: r.algorithm,
        runtime_ms: r.execution_time_ms,
        comparisons: r.comparisons,
        swaps: r.swaps
      });
    });
    const limited = updated.slice(0, 50); // limit to 50 items
    setRunHistory(limited);
    localStorage.setItem("sorting_history", JSON.stringify(limited));
  };

  const clearHistory = () => {
    setRunHistory([]);
    localStorage.removeItem("sorting_history");
  };

  const getDatasetSizeFromExponent = (exp: number) => {
    return Math.pow(10, exp);
  };

  const toggleAlgoSelection = (algoName: string) => {
    if (selectedAlgos.includes(algoName)) {
      if (selectedAlgos.length > 1) {
        setSelectedAlgos(selectedAlgos.filter(a => a !== algoName));
      }
    } else {
      setSelectedAlgos([...selectedAlgos, algoName]);
    }
  };

  const handleRunBenchmark = async () => {
    setBenchLoading(true);
    setBenchError(null);
    const size = getDatasetSizeFromExponent(sizeExponent);
    try {
      const res = await fetch(`${API_URL}/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          algos: selectedAlgos,
          size,
          dataset: datasetType,
          threshold,
          pivot: pivotStrategy,
          runs: timingRuns,
          seed
        })
      });

      if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || "Execution failed");
      }

      const data = await res.json();
      setBenchResults(data.results);
      saveToHistory(data.results);
    } catch (e) {
      const err = e as Error;
      setBenchError(err.message || "An unexpected error occurred during execution.");
    } finally {
      setBenchLoading(false);
    }
  };

  // ── STATE: Visualizer ──
  const [selectedVizAlgos, setSelectedVizAlgos] = useState<string[]>(["introsort"]);
  const [vizSize, setVizSize] = useState<number>(40);
  const [vizSpeed, setVizSpeed] = useState<number>(30); // delay in ms
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Visualizer stats
  const [vizStartTime, setVizStartTime] = useState<number | null>(null);
  const [vizElapsedTime, setVizElapsedTime] = useState<number>(0);

  interface VizElement {
    value: number;
    state: "unsorted" | "compare" | "operation" | "sorted";
  }

  interface VizState {
    algo: string;
    array: VizElement[];
    comparisons: number;
    swaps: number;
    depth: number;
    currentSubAlgo: string;
    currentPartitionSize: number;
    switchStatus: string;
    depthLimit: number;
    done: boolean;
    winner: boolean;
  }

  interface VizContext {
    onCompare: () => void;
    onSwap: () => void;
    onDepth: (depth: number) => void;
    onSubAlgo: (algo: string) => void;
    onPartition: (size: number) => void;
    onStatus: (status: string) => void;
  }

  const [vizStates, setVizStates] = useState<Record<string, VizState>>({});
  const [vizThreshold, setVizThreshold] = useState<number>(10);

  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const generatorsRef = useRef<Record<string, Generator<void, void | number, unknown> | null>>({});
  const vizArraysRef = useRef<Record<string, VizElement[]>>({});
  const vizStatesRef = useRef<Record<string, VizState>>({});

  const statsRef = useRef<Record<string, {
    comparisons: number;
    swaps: number;
    depth: number;
    currentSubAlgo: string;
    currentPartitionSize: number;
    switchStatus: string;
  }>>({});

  useEffect(() => {
    vizStatesRef.current = vizStates;
  }, [vizStates]);

  // Generate new visualizer dataset
  const generateNewVisualizerArray = useCallback(() => {
    if (animationRef.current) clearInterval(animationRef.current);
    setIsPlaying(false);
    
    generatorsRef.current = {};
    vizArraysRef.current = {};
    
    const baseArray: VizElement[] = [];
    for (let i = 0; i < vizSize; ++i) {
      baseArray.push({
        value: Math.floor(Math.random() * 380) + 20,
        state: "unsorted"
      });
    }

    const initialStates: Record<string, VizState> = {};
    selectedVizAlgos.forEach(algo => {
      vizArraysRef.current[algo] = baseArray.map(x => ({ ...x }));
      statsRef.current[algo] = {
        comparisons: 0,
        swaps: 0,
        depth: 0,
        currentSubAlgo: algo === "introsort" ? "QuickSort" : getAlgoDisplayName(algo),
        currentPartitionSize: vizSize,
        switchStatus: "Active"
      };

      initialStates[algo] = {
        algo,
        array: vizArraysRef.current[algo],
        comparisons: 0,
        swaps: 0,
        depth: 0,
        currentSubAlgo: statsRef.current[algo].currentSubAlgo,
        currentPartitionSize: vizSize,
        switchStatus: "Active",
        depthLimit: 2 * Math.floor(Math.log2(vizSize)),
        done: false,
        winner: false
      };
    });

    setVizStates(initialStates);
    setVizElapsedTime(0);
    setVizStartTime(null);
  }, [vizSize, selectedVizAlgos]);

  useEffect(() => {
    const timer = setTimeout(() => {
      generateNewVisualizerArray();
    }, 0);
    return () => clearTimeout(timer);
  }, [generateNewVisualizerArray, vizThreshold]);

  // ── GENERATORS: Sorting Step-by-Step ──
  
  // 1. Insertion Sort Generator
  function* insertionSortGen(arr: VizElement[], low: number, high: number, ctx: VizContext) {
    ctx.onSubAlgo("InsertionSort");
    ctx.onStatus("Insertion Sort Active");
    for (let i = low + 1; i <= high; ++i) {
      const key = arr[i].value;
      let j = i - 1;
      arr[i].state = "operation";
      yield;
      
      while (j >= low) {
        arr[j].state = "compare";
        ctx.onCompare();
        yield;
        
        if (arr[j].value > key) {
          arr[j + 1].value = arr[j].value;
          arr[j + 1].state = "operation";
          ctx.onSwap();
          arr[j].state = "unsorted";
          yield;
          --j;
        } else {
          arr[j].state = "unsorted";
          break;
        }
      }
      arr[j + 1].value = key;
      arr[j + 1].state = "unsorted";
      yield;
    }
    for (let i = low; i <= high; ++i) {
      arr[i].state = "sorted";
    }
    yield;
  }

  // 2. Heap Sort Generator
  function* heapifyGen(arr: VizElement[], low: number, n: number, root: number, ctx: VizContext): Generator<void, void, unknown> {
    let largest = root;
    const left = 2 * root + 1;
    const right = 2 * root + 2;

    if (left < n) {
      arr[low + left].state = "compare";
      arr[low + largest].state = "compare";
      ctx.onCompare();
      yield;
      if (arr[low + left].value > arr[low + largest].value) {
        largest = left;
      }
      arr[low + left].state = "unsorted";
      arr[low + largest].state = "unsorted";
    }

    if (right < n) {
      arr[low + right].state = "compare";
      arr[low + largest].state = "compare";
      ctx.onCompare();
      yield;
      if (arr[low + right].value > arr[low + largest].value) {
        largest = right;
      }
      arr[low + right].state = "unsorted";
      arr[low + largest].state = "unsorted";
    }

    if (largest !== root) {
      const temp = arr[low + root].value;
      arr[low + root].value = arr[low + largest].value;
      arr[low + largest].value = temp;
      
      arr[low + root].state = "operation";
      arr[low + largest].state = "operation";
      ctx.onSwap();
      yield;

      arr[low + root].state = "unsorted";
      arr[low + largest].state = "unsorted";

      yield* heapifyGen(arr, low, n, largest, ctx);
    }
  }

  function* heapSortGen(arr: VizElement[], low: number, high: number, ctx: VizContext) {
    ctx.onSubAlgo("HeapSort");
    ctx.onStatus("Heap Sort Fallback");
    const n = high - low + 1;
    
    // Build heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      yield* heapifyGen(arr, low, n, i, ctx);
    }

    // Extract elements
    for (let i = n - 1; i > 0; i--) {
      const temp = arr[low].value;
      arr[low].value = arr[low + i].value;
      arr[low + i].value = temp;
      
      arr[low].state = "operation";
      arr[low + i].state = "sorted";
      ctx.onSwap();
      yield;

      arr[low].state = "unsorted";
      
      yield* heapifyGen(arr, low, i, 0, ctx);
    }
    arr[low].state = "sorted";
    yield;
  }

  // 3. Partition Helper for QuickSort Generators
  function* partitionGen(arr: VizElement[], low: number, high: number, ctx: VizContext): Generator<void, number, unknown> {
    arr[high].state = "operation"; // pivot
    const pivot = arr[high].value;
    let i = low - 1;

    for (let j = low; j < high; ++j) {
      arr[j].state = "compare";
      ctx.onCompare();
      yield;

      if (arr[j].value <= pivot) {
        i++;
        if (i !== j) {
          const temp = arr[i].value;
          arr[i].value = arr[j].value;
          arr[j].value = temp;
          
          arr[i].state = "operation";
          arr[j].state = "operation";
          ctx.onSwap();
          yield;
          arr[i].state = "unsorted";
        }
      }
      arr[j].state = "unsorted";
    }

    const temp = arr[i + 1].value;
    arr[i + 1].value = arr[high].value;
    arr[high].value = temp;
    
    arr[i + 1].state = "operation";
    arr[high].state = "unsorted";
    ctx.onSwap();
    yield;
    arr[i + 1].state = "unsorted";
    
    return i + 1;
  }

  // 4. QuickSort Generator
  function* quickSortUtilGen(arr: VizElement[], low: number, high: number, depth: number, ctx: VizContext): Generator<void, void, unknown> {
    if (low >= high) {
      if (low >= 0 && low < arr.length) arr[low].state = "sorted";
      return;
    }
    ctx.onDepth(depth);
    ctx.onPartition(high - low + 1);
    ctx.onSubAlgo("QuickSort");

    const p: number = yield* partitionGen(arr, low, high, ctx);
    arr[p].state = "sorted";
    yield;

    yield* quickSortUtilGen(arr, low, p - 1, depth + 1, ctx);
    yield* quickSortUtilGen(arr, p + 1, high, depth + 1, ctx);
  }

  // 5. MergeSort Generator
  function* mergeSortUtilGen(arr: VizElement[], low: number, high: number, ctx: VizContext): Generator<void, void, unknown> {
    if (low >= high) return;
    const mid = Math.floor(low + (high - low) / 2);
    yield* mergeSortUtilGen(arr, low, mid, ctx);
    yield* mergeSortUtilGen(arr, mid + 1, high, ctx);
    
    // Merge step
    ctx.onSubAlgo("MergeSort");
    let left = low;
    let right = mid + 1;
    const temp: number[] = [];

    while (left <= mid && right <= high) {
      arr[left].state = "compare";
      arr[right].state = "compare";
      ctx.onCompare();
      yield;
      
      if (arr[left].value <= arr[right].value) {
        temp.push(arr[left].value);
        arr[left].state = "unsorted";
        left++;
      } else {
        temp.push(arr[right].value);
        arr[right].state = "unsorted";
        right++;
      }
    }

    while (left <= mid) {
      temp.push(arr[left].value);
      left++;
    }
    while (right <= high) {
      temp.push(arr[right].value);
      right++;
    }

    for (let k = 0; k < temp.length; ++k) {
      arr[low + k].value = temp[k];
      arr[low + k].state = "operation";
      ctx.onSwap();
      yield;
      arr[low + k].state = "unsorted";
    }

    if (low === 0 && high === arr.length - 1) {
      for (let k = 0; k < arr.length; ++k) {
        arr[k].state = "sorted";
      }
    }
    yield;
  }

  // 6. Quick + Insertion Generator
  function* quickInsertionUtilGen(arr: VizElement[], low: number, high: number, thresh: number, depth: number, ctx: VizContext): Generator<void, void, unknown> {
    if (low >= high) return;
    ctx.onDepth(depth);
    const size = high - low + 1;
    ctx.onPartition(size);

    if (size < thresh) {
      yield* insertionSortGen(arr, low, high, ctx);
      return;
    }

    ctx.onSubAlgo("QuickSort");
    ctx.onStatus("QuickSort Active");
    const p: number = yield* partitionGen(arr, low, high, ctx);
    arr[p].state = "sorted";
    yield;

    yield* quickInsertionUtilGen(arr, low, p - 1, thresh, depth + 1, ctx);
    yield* quickInsertionUtilGen(arr, p + 1, high, thresh, depth + 1, ctx);
  }

  // 7. Quick + Merge Generator
  function* quickMergeUtilGen(arr: VizElement[], low: number, high: number, thresh: number, depth: number, ctx: VizContext): Generator<void, void, unknown> {
    if (low >= high) return;
    ctx.onDepth(depth);
    const size = high - low + 1;
    ctx.onPartition(size);

    if (size < thresh) {
      yield* mergeSortUtilGen(arr, low, high, ctx);
      return;
    }

    ctx.onSubAlgo("QuickSort");
    ctx.onStatus("QuickSort Active");
    const p: number = yield* partitionGen(arr, low, high, ctx);
    arr[p].state = "sorted";
    yield;

    yield* quickMergeUtilGen(arr, low, p - 1, thresh, depth + 1, ctx);
    yield* quickMergeUtilGen(arr, p + 1, high, thresh, depth + 1, ctx);
  }

  // 8. Introsort Generator
  function* introsortUtilGen(arr: VizElement[], low: number, high: number, thresh: number, depthLimit: number, depth: number, ctx: VizContext): Generator<void, void, unknown> {
    if (low >= high) return;
    ctx.onDepth(depth);
    const size = high - low + 1;
    ctx.onPartition(size);

    if (size < thresh) {
      yield* insertionSortGen(arr, low, high, ctx);
      return;
    }

    if (depth >= depthLimit) {
      yield* heapSortGen(arr, low, high, ctx);
      return;
    }

    ctx.onSubAlgo("QuickSort");
    ctx.onStatus("QuickSort Active");
    const p: number = yield* partitionGen(arr, low, high, ctx);
    arr[p].state = "sorted";
    yield;

    yield* introsortUtilGen(arr, low, p - 1, thresh, depthLimit, depth + 1, ctx);
    yield* introsortUtilGen(arr, p + 1, high, thresh, depthLimit, depth + 1, ctx);
  }

  // Visualizer master loop driver (runs in parallel for all checked algos)
  const runVisualizerStep = () => {
    let startTime = vizStartTime;
    if (!startTime) {
      startTime = Date.now();
      setVizStartTime(startTime);
    }

    const elapsed = Math.floor((Date.now() - startTime) / 100);
    setVizElapsedTime(elapsed);

    const nextStates = { ...vizStatesRef.current };
    let allFinished = true;

    selectedVizAlgos.forEach(algo => {
      const currentState = nextStates[algo];
      if (!currentState) return;
      if (currentState.done) return;

      allFinished = false;

      // 1. Get or create generator
      if (!generatorsRef.current[algo]) {
        const tempArray = vizArraysRef.current[algo];
        const thresh = vizThreshold;
        const depthLimit = currentState.depthLimit;
        
        const ctx: VizContext = {
          onCompare: () => { statsRef.current[algo].comparisons++ },
          onSwap: () => { statsRef.current[algo].swaps++ },
          onDepth: (d) => { statsRef.current[algo].depth = Math.max(statsRef.current[algo].depth, d) },
          onSubAlgo: (sa) => { statsRef.current[algo].currentSubAlgo = sa },
          onPartition: (sz) => { statsRef.current[algo].currentPartitionSize = sz },
          onStatus: (st) => { statsRef.current[algo].switchStatus = st }
        };

        if (algo === "introsort") {
          generatorsRef.current[algo] = introsortUtilGen(tempArray, 0, tempArray.length - 1, thresh, depthLimit, 0, ctx);
        } else if (algo === "quick_insertion") {
          generatorsRef.current[algo] = quickInsertionUtilGen(tempArray, 0, tempArray.length - 1, thresh, 0, ctx);
        } else if (algo === "quick_merge") {
          generatorsRef.current[algo] = quickMergeUtilGen(tempArray, 0, tempArray.length - 1, thresh, 0, ctx);
        } else if (algo === "quicksort") {
          generatorsRef.current[algo] = quickSortUtilGen(tempArray, 0, tempArray.length - 1, 0, ctx);
        } else if (algo === "mergesort") {
          generatorsRef.current[algo] = mergeSortUtilGen(tempArray, 0, tempArray.length - 1, ctx);
        } else if (algo === "heapsort") {
          generatorsRef.current[algo] = heapSortGen(tempArray, 0, tempArray.length - 1, ctx);
        }
      }

      // 2. Advance generator
      const gen = generatorsRef.current[algo];
      const nextStep = gen?.next();

      if (nextStep && !nextStep.done) {
        nextStates[algo] = {
          ...currentState,
          array: vizArraysRef.current[algo].map(x => ({ ...x })),
          comparisons: statsRef.current[algo].comparisons,
          swaps: statsRef.current[algo].swaps,
          depth: statsRef.current[algo].depth,
          currentSubAlgo: statsRef.current[algo].currentSubAlgo,
          currentPartitionSize: statsRef.current[algo].currentPartitionSize,
          switchStatus: statsRef.current[algo].switchStatus
        };
      } else {
        const finalSorted = vizArraysRef.current[algo].map(x => ({ ...x, state: "sorted" as const }));
        nextStates[algo] = {
          ...currentState,
          done: true,
          array: finalSorted,
          switchStatus: "Completed",
          comparisons: statsRef.current[algo].comparisons,
          swaps: statsRef.current[algo].swaps,
          depth: statsRef.current[algo].depth
        };
      }
    });

    if (allFinished) {
      setIsPlaying(false);
      if (animationRef.current) clearInterval(animationRef.current);

      // Evaluate winner based on minimum comparisons
      let winnerAlgo = "";
      let minComparisons = Infinity;
      let minSwaps = Infinity;

      selectedVizAlgos.forEach(algo => {
        const state = nextStates[algo];
        if (state) {
          if (state.comparisons < minComparisons) {
            minComparisons = state.comparisons;
            minSwaps = state.swaps;
            winnerAlgo = algo;
          } else if (state.comparisons === minComparisons && state.swaps < minSwaps) {
            minSwaps = state.swaps;
            winnerAlgo = algo;
          }
        }
      });

      selectedVizAlgos.forEach(algo => {
        if (nextStates[algo]) {
          nextStates[algo].winner = (algo === winnerAlgo);
        }
      });
    }

    setVizStates(nextStates);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) clearInterval(animationRef.current);
    } else {
      setIsPlaying(true);
      animationRef.current = setInterval(() => {
        runVisualizerStep();
      }, vizSpeed);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      if (animationRef.current) clearInterval(animationRef.current);
      animationRef.current = setInterval(() => {
        runVisualizerStep();
      }, vizSpeed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vizSpeed, isPlaying]);

  useEffect(() => {
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFFFFF] flex flex-col font-sans antialiased text-sm">
      {/* Top Navbar */}
      <header className="border-b border-[#232323] bg-[#050505]/95 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div>
            <span className="text-sm font-semibold text-[#FFFFFF] tracking-tight">
              SortLab
            </span>
            <span className="text-[10px] text-[#A3A3A3] tracking-tight block">
              Hybrid sorting
            </span>
          </div>
        </div>

        <nav className="flex bg-[#0D0D0D] rounded border border-[#232323] p-0.5">
          {(["overview", "benchmark", "visualizer", "analysis"] as const).map((tab) => {
            const displayNames = {
              overview: "Overview",
              benchmark: "Benchmark",
              visualizer: "Visualizer",
              analysis: "Analysis"
            };
            return (
              <button 
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab !== "visualizer" && animationRef.current) {
                    // stop visualizer when navigating away
                    setIsPlaying(false);
                    clearInterval(animationRef.current);
                  }
                }}
                className={`px-3.5 py-1 rounded text-xs transition-all duration-150 ${activeTab === tab ? "bg-[#151515] text-[#22C55E] border border-[#232323] font-semibold" : "text-[#A3A3A3] hover:text-[#FFFFFF]"}`}
              >
                {displayNames[tab]}
              </button>
            );
          })}
        </nav>

        <a 
          href="https://github.com/Unceas/Efficient-Sorting" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#FFFFFF] transition duration-150"
        >
          GitHub
        </a>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6 overflow-y-auto">
        
        {/* ── PAGE 1: Overview ── */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full py-4">
            {/* Hero Section */}
            <div className="bg-[#0D0D0D] border border-[#232323] rounded px-8 py-12 flex flex-col gap-4 text-center w-full">
              <span className="text-[10px] font-mono text-[#22C55E] tracking-wider block">
                Release v3.0
              </span>
              <div>
                <h1 className="text-3xl font-semibold text-[#FFFFFF] tracking-tight">
                  Hybrid Sorting Systems
                </h1>
              </div>
              <p className="text-[#A3A3A3] leading-relaxed text-xs max-w-xl mx-auto">
                Benchmark, visualize and analyze hybrid sorting algorithms through interactive performance experiments.
              </p>
              <div className="flex gap-3 justify-center mt-2">
                <button
                  onClick={() => setActiveTab("benchmark")}
                  className="bg-[#22C55E] hover:bg-[#4ADE80] active:bg-[#166534] text-[#050505] font-semibold px-5 py-2 rounded text-xs transition duration-150"
                >
                  Open Benchmark
                </button>
                <button
                  onClick={() => setActiveTab("visualizer")}
                  className="bg-[#151515] border border-[#232323] hover:bg-[#0D0D0D] text-[#FFFFFF] font-semibold px-5 py-2 rounded text-xs transition duration-150"
                >
                  Explore Algorithms
                </button>
              </div>
            </div>

            {/* Structured Overview Details */}
            <div className="border-t border-[#232323] pt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[#FFFFFF]">Brief overview</h3>
                <p className="text-[#A3A3A3] leading-relaxed">
                  This platform functions as an engineering environment designed to analyze adaptive hybrid sorting algorithms. Hybrid algorithms combine recursive partitioning strategies with high-efficiency base cases (such as insertion sort) to mitigate recursion depth overhead, optimize hardware caching, and maximize processor utilization.
                </p>
                <p className="text-[#A3A3A3] leading-relaxed">
                  By executing sorting kernels compiled directly on Native C++ pipelines, the platform reports low-level hardware telemetry, allowing engineers to determine optimal crossover thresholds.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[#FFFFFF]">Implemented algorithms</h3>
                <div className="flex flex-col gap-2 font-mono text-[11px] text-[#A3A3A3]">
                  <div className="border-b border-[#232323] pb-1">
                    <span className="text-[#22C55E]">Introsort:</span> QuickSort with fallback to HeapSort when depth limit exceeded, combined with InsertionSort base cases.
                  </div>
                  <div className="border-b border-[#232323] pb-1">
                    <span className="text-[#22C55E]">Quick + Insertion:</span> QuickSort partitioning falling back to InsertionSort when subarray size ≤ threshold.
                  </div>
                  <div className="border-b border-[#232323] pb-1">
                    <span className="text-[#22C55E]">Quick + Merge:</span> QuickSort falling back to MergeSort when partition size drops below threshold.
                  </div>
                  <div className="pb-1">
                    <span className="text-[#22C55E]">Standard Kernels:</span> Pure QuickSort, MergeSort, and HeapSort benchmarks for base baseline controls.
                  </div>
                </div>
              </div>
            </div>

            {/* System Workflow */}
            <div className="border-t border-[#232323] pt-8 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#FFFFFF]">System workflow</h3>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-xs font-mono text-[#A3A3A3]">
                {[
                  { num: "01", step: "Dataset", desc: "Generate sequence data" },
                  { num: "02", step: "Select", desc: "Choose active targets" },
                  { num: "03", step: "Execute", desc: "C++ kernel benchmarks" },
                  { num: "04", step: "Telemetry", desc: "Collect resource stats" },
                  { num: "05", step: "Plot", desc: "Generate scaling curves" },
                  { num: "06", step: "Analyze", desc: "Determine crossovers" }
                ].map((item, idx) => (
                  <div key={idx} className="border border-[#232323] bg-[#0D0D0D] p-3 flex flex-col gap-1 rounded">
                    <span className="text-[#737373] text-[9px]">{item.num}</span>
                    <span className="text-[#FFFFFF] font-semibold">{item.step}</span>
                    <span className="text-[10px] text-[#737373]">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture Diagram */}
            <div className="border-t border-[#232323] pt-8 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#FFFFFF]">Architecture diagram</h3>
              <div className="border border-[#232323] bg-[#0D0D0D] p-6 rounded flex flex-col md:flex-row items-stretch justify-center gap-4 text-xs font-mono">
                <div className="border border-[#232323] bg-[#151515] p-4 flex flex-col justify-center items-center text-center flex-1 rounded">
                  <span className="text-[#22C55E] font-bold">Client UI</span>
                  <span className="text-[#737373] text-[10px] mt-1">Next.js / React</span>
                  <span className="text-[#A3A3A3] text-[10px] mt-2 border-t border-[#232323] pt-2 w-full">Visualizer canvas, controls, scaling plots</span>
                </div>
                
                <div className="flex items-center justify-center text-[#737373] font-sans">
                  <span className="hidden md:inline">🖧</span>
                  <span className="inline md:hidden">▼</span>
                </div>

                <div className="border border-[#232323] bg-[#151515] p-4 flex flex-col justify-center items-center text-center flex-1 rounded">
                  <span className="text-[#22C55E] font-bold">API Gateway</span>
                  <span className="text-[#737373] text-[10px] mt-1">FastAPI REST Server</span>
                  <span className="text-[#A3A3A3] text-[10px] mt-2 border-t border-[#232323] pt-2 w-full">Endpoint coordination, payload serialization</span>
                </div>

                <div className="flex items-center justify-center text-[#737373] font-sans">
                  <span className="hidden md:inline">🖧</span>
                  <span className="inline md:hidden">▼</span>
                </div>

                <div className="border border-[#232323] bg-[#151515] p-4 flex flex-col justify-center items-center text-center flex-1 rounded">
                  <span className="text-[#FFFFFF] font-bold">Performance Engine</span>
                  <span className="text-[#737373] text-[10px] mt-1">Native C++ Binary</span>
                  <span className="text-[#A3A3A3] text-[10px] mt-2 border-t border-[#232323] pt-2 w-full">Sorting execution, telemetry measurements</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PAGE 2: Benchmark ── */}
        {activeTab === "benchmark" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lab Configuration Panel */}
            <div className="bg-[#0D0D0D] border border-[#232323] rounded p-5 flex flex-col gap-4">
              <div className="border-b border-[#232323] pb-2 mb-1">
                <h3 className="text-xs font-semibold text-[#FFFFFF]">Configuration panel</h3>
              </div>

              {/* Dataset Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#A3A3A3] font-semibold">Dataset type</label>
                <select
                  value={datasetType}
                  onChange={(e) => setDatasetType(e.target.value)}
                  className="bg-[#050505] border border-[#232323] rounded px-3 py-2 text-[#FFFFFF] focus:outline-none focus:border-[#22C55E] text-xs transition duration-150"
                >
                  <option value="random">Random (uniform)</option>
                  <option value="nearly_sorted">Nearly sorted</option>
                  <option value="reverse_sorted">Reverse sorted</option>
                  <option value="duplicate_heavy">Duplicate heavy</option>
                </select>
              </div>

              {/* Dataset Size Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] text-[#A3A3A3] font-semibold">
                  <span>Dataset size (n)</span>
                  <span className="text-[#22C55E] font-semibold">{getDatasetSizeFromExponent(sizeExponent).toLocaleString()}</span>
                </div>
                <input 
                  type="range"
                  min="2"
                  max="6"
                  value={sizeExponent}
                  onChange={(e) => setSizeExponent(parseInt(e.target.value))}
                  className="accent-[#22C55E] bg-[#050505] h-1.5 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-[#737373] px-1 font-mono">
                  <span>100</span>
                  <span>1K</span>
                  <span>10K</span>
                  <span>100K</span>
                  <span>1M</span>
                </div>
              </div>

              {/* Crossover Threshold */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#A3A3A3] font-semibold">Crossover threshold</label>
                <select
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="bg-[#050505] border border-[#232323] rounded px-3 py-2 text-[#FFFFFF] focus:outline-none focus:border-[#22C55E] text-xs transition duration-150"
                >
                  <option value={8}>8 elements</option>
                  <option value={16}>16 elements</option>
                  <option value={32}>32 elements</option>
                  <option value={64}>64 elements</option>
                </select>
              </div>

              {/* Pivot Strategy */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#A3A3A3] font-semibold">Pivot strategy</label>
                <select
                  value={pivotStrategy}
                  onChange={(e) => setPivotStrategy(e.target.value)}
                  className="bg-[#050505] border border-[#232323] rounded px-3 py-2 text-[#FFFFFF] focus:outline-none focus:border-[#22C55E] text-xs transition duration-150"
                >
                  <option value="first">First element</option>
                  <option value="random">Random index</option>
                  <option value="median_of_three">Median of three</option>
                </select>
              </div>

              {/* Algorithms Selection Checkboxes */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-[#A3A3A3] font-semibold">Algorithm selection</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "quicksort", name: "QuickSort" },
                    { id: "mergesort", name: "MergeSort" },
                    { id: "heapsort", name: "HeapSort" },
                    { id: "quick_insertion", name: "Quick + Insertion" },
                    { id: "quick_merge", name: "Quick + Merge" },
                    { id: "introsort", name: "Introsort" }
                  ].map(algoItem => (
                    <label 
                      key={algoItem.id} 
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition duration-150 ${selectedAlgos.includes(algoItem.id) ? "bg-[#166534]/10 border-[#22C55E] text-[#FFFFFF]" : "bg-[#050505] border-[#232323] text-[#A3A3A3] hover:border-[#737373]"}`}
                    >
                      <input 
                        type="checkbox"
                        checked={selectedAlgos.includes(algoItem.id)}
                        onChange={() => toggleAlgoSelection(algoItem.id)}
                        className="accent-[#22C55E] rounded"
                      />
                      <span>{algoItem.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleRunBenchmark}
                disabled={benchLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-[#4ADE80] active:bg-[#166534] disabled:bg-[#151515] disabled:text-[#737373] text-[#050505] font-semibold py-2.5 rounded transition duration-150 text-xs mt-2"
              >
                {benchLoading ? "Running..." : "Run benchmark"}
              </button>
            </div>

            {/* Results, Charts & Summary Panels */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {benchError && (
                <div className="bg-[#166534]/10 border border-[#22C55E]/20 text-[#22C55E] p-4 rounded text-xs">
                  {benchError}
                </div>
              )}

              {/* Benchmark Summary Printout */}
              {benchResults.length > 0 && (
                (() => {
                  const best = [...benchResults].reduce((min, cur) => cur.execution_time_ms < min.execution_time_ms ? cur : min, benchResults[0]);
                  return (
                    <div className="font-mono text-xs text-[#A3A3A3] border-b border-[#232323] pb-3">
                      Diagnostics: <span className="text-[#22C55E]">{getAlgoDisplayName(best.algorithm)}</span> completed in <span className="text-[#FFFFFF] font-bold">{(best.execution_time_ms * 1000).toFixed(1)} μs</span> (fastest)
                    </div>
                  );
                })()
              )}

              {/* Results Table */}
              <div className="bg-[#0D0D0D] border border-[#232323] rounded p-5">
                <h3 className="text-xs font-semibold text-[#FFFFFF] mb-4 border-b border-[#232323] pb-2">
                  Benchmark results
                </h3>
                {benchResults.length === 0 ? (
                  <div className="text-center py-12 text-[#737373] italic text-xs">
                    No active results. Configure parameters and run benchmark to compile records.
                  </div>
                ) : (
                  (() => {
                    const best = [...benchResults].reduce((min, cur) => cur.execution_time_ms < min.execution_time_ms ? cur : min, benchResults[0]);
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#232323] text-[#A3A3A3] font-semibold text-[10px]">
                              <th className="py-2 px-3">Algorithm</th>
                              <th className="py-2 px-3 text-right">Runtime (μs)</th>
                              <th className="py-2 px-3 text-right">Comparisons</th>
                              <th className="py-2 px-3 text-right">Swaps / writes</th>
                              <th className="py-2 px-3 text-right">Memory (B)</th>
                            </tr>
                          </thead>
                          <tbody className="font-mono text-[#A3A3A3]">
                            {benchResults.map((r, idx) => {
                              const isFastest = r.algorithm === best.algorithm;
                              const rowBg = isFastest ? "bg-[#166534]/5 text-[#FFFFFF]" : "hover:bg-[#151515]/20";
                              const borderCell = (pos: "first" | "middle" | "last") => {
                                if (!isFastest) return "border-b border-[#232323] py-2 px-3";
                                if (pos === "first") return "border-t border-b border-l border-[#22C55E] py-2 px-3 text-[#22C55E]";
                                if (pos === "last") return "border-t border-b border-r border-[#22C55E] py-2 px-3";
                                return "border-t border-b border-[#22C55E] py-2 px-3";
                              };

                              return (
                                <tr key={idx} className={rowBg}>
                                  <td className={borderCell("first")}>
                                    {isFastest ? `✓ ${getAlgoDisplayName(r.algorithm)}` : getAlgoDisplayName(r.algorithm)}
                                  </td>
                                  <td className={`${borderCell("middle")} text-right font-bold`}>
                                    {(r.execution_time_ms * 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                  </td>
                                  <td className={`${borderCell("middle")} text-right`}>
                                    {r.comparisons.toLocaleString()}
                                  </td>
                                  <td className={`${borderCell("middle")} text-right`}>
                                    {r.swaps.toLocaleString()}
                                  </td>
                                  <td className={`${borderCell("last")} text-right`}>
                                    {r.memory_usage_bytes ? r.memory_usage_bytes.toLocaleString() : "0"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Graphs Area */}
              {benchResults.length > 0 && (
                (() => {
                  const best = [...benchResults].reduce((min, cur) => cur.execution_time_ms < min.execution_time_ms ? cur : min, benchResults[0]);
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Runtime Bar Chart */}
                      <div className="bg-[#0D0D0D] border border-[#232323] rounded p-5">
                        <h4 className="text-xs font-semibold text-[#A3A3A3] mb-4">Runtime comparison (μs)</h4>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={benchResults.map(r => ({ ...r, runtime_us: r.execution_time_ms * 1000 }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#232323" />
                              <XAxis dataKey="algorithm" stroke="#A3A3A3" tickFormatter={(v) => v.replace("quick_", "Q+").replace("sort", "")} style={{ fontSize: 9 }} />
                              <YAxis stroke="#A3A3A3" style={{ fontSize: 9 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#232323', fontSize: 10, color: '#FFFFFF' }} />
                              <Bar dataKey="runtime_us" name="Time (μs)" radius={[2, 2, 0, 0]}>
                                {benchResults.map((entry, index) => {
                                  const isFastest = entry.algorithm === best.algorithm;
                                  return <Cell key={`cell-${index}`} fill={isFastest ? "#22C55E" : "#232323"} stroke={isFastest ? "#22C55E" : "#737373"} strokeWidth={1} />;
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Scale Line Chart (Estimates based on scaling curves) */}
                      <div className="bg-[#0D0D0D] border border-[#232323] rounded p-5">
                        <h4 className="text-xs font-semibold text-[#A3A3A3] mb-4">Performance vs dataset size</h4>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[
                              { size: "100", quicksort: 5, mergesort: 8, heapsort: 9, introsort: 4 },
                              { size: "1K", quicksort: 65, mergesort: 92, heapsort: 104, introsort: 55 },
                              { size: "10K", quicksort: 780, mergesort: 1100, heapsort: 1250, introsort: 680 },
                              { size: "100K", quicksort: 9100, mergesort: 13200, heapsort: 14800, introsort: 8100 }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#232323" />
                              <XAxis dataKey="size" stroke="#A3A3A3" style={{ fontSize: 9 }} />
                              <YAxis stroke="#A3A3A3" style={{ fontSize: 9 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#232323', fontSize: 10, color: '#FFFFFF' }} />
                              <Line type="monotone" dataKey="introsort" stroke="#22C55E" strokeWidth={1.5} name="Introsort" dot={false} />
                              <Line type="monotone" dataKey="quicksort" stroke="#A3A3A3" strokeWidth={1.2} name="Quick" dot={false} />
                              <Line type="monotone" dataKey="mergesort" stroke="#FFFFFF" strokeWidth={1.2} name="Merge" dot={false} />
                              <Line type="monotone" dataKey="heapsort" stroke="#737373" strokeWidth={1.2} name="Heap" dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* History and Exports Optional features */}
              {runHistory.length > 0 && (
                <div className="bg-[#0D0D0D] border border-[#222222] rounded p-5">
                  <div className="flex items-center justify-between border-b border-[#222222] pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-[#F8F8F8]">Local experiment history</h4>
                    </div>
                    <button
                      onClick={clearHistory}
                      className="text-[10px] text-[#22C55E] hover:underline font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto text-[11px] font-mono flex flex-col gap-2">
                    {runHistory.map(h => (
                      <div key={h.id} className="flex justify-between items-center py-1 border-b border-[#222222] text-[#9A9A9A]">
                        <span>{h.date} | {h.dataset} (n={h.size.toLocaleString()})</span>
                        <span>{getAlgoDisplayName(h.algorithm)}: <strong className="text-[#22C55E]">{(h.runtime_ms * 1000).toFixed(0)} μs</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PAGE 3: Sorting Visualizer ── */}
        {activeTab === "visualizer" && (
          <div className="flex flex-col gap-6">
            {/* Visualizer Controls */}
            <div className="bg-[#0D0D0D] border border-[#232323] rounded p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold text-[#FFFFFF]">Visualizer control panel</h3>
                <p className="text-[11px] text-[#A3A3A3]">Select algorithms to compare side-by-side, adjust array parameters, and run the visualization pipeline.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                {/* Algorithm Checklist */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <span className="text-[10px] text-[#A3A3A3] uppercase tracking-wider font-semibold">Algorithms to visualize</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
                    {[
                      { id: "introsort", name: "Introsort" },
                      { id: "quick_insertion", name: "Quick + Insertion" },
                      { id: "quick_merge", name: "Quick + Merge" },
                      { id: "quicksort", name: "QuickSort" },
                      { id: "mergesort", name: "MergeSort" },
                      { id: "heapsort", name: "HeapSort" }
                    ].map(algo => {
                      const checked = selectedVizAlgos.includes(algo.id);
                      return (
                        <label key={algo.id} className="flex items-center gap-2 text-xs text-[#FFFFFF] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                if (selectedVizAlgos.length > 1) {
                                  setSelectedVizAlgos(selectedVizAlgos.filter(a => a !== algo.id));
                                }
                              } else {
                                setSelectedVizAlgos([...selectedVizAlgos, algo.id]);
                              }
                            }}
                            className="accent-[#22C55E]"
                          />
                          <span>{algo.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Array Size */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-[#A3A3A3] uppercase tracking-wider font-semibold">
                    <span>Array size</span>
                    <span className="text-[#22C55E] font-bold">{vizSize}</span>
                  </div>
                  <input 
                    type="range"
                    min="15"
                    max="100"
                    value={vizSize}
                    onChange={(e) => setVizSize(parseInt(e.target.value))}
                    className="accent-[#22C55E] bg-zinc-950 h-1 rounded cursor-pointer"
                  />
                </div>

                {/* Crossover Threshold */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-[#A3A3A3] uppercase tracking-wider font-semibold">
                    <span>Crossover threshold</span>
                    <span className="text-[#22C55E] font-bold">{vizThreshold}</span>
                  </div>
                  <input 
                    type="range"
                    min="4"
                    max="35"
                    value={vizThreshold}
                    onChange={(e) => setVizThreshold(parseInt(e.target.value))}
                    className="accent-[#22C55E] bg-zinc-950 h-1 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#232323] my-2" />

              {/* Lower Controls & Action Buttons */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                  {/* Animation Delay */}
                  <div className="flex flex-col gap-1.5 w-48">
                    <div className="flex justify-between items-center text-[10px] text-[#A3A3A3] uppercase tracking-wider font-semibold">
                      <span>Animation delay</span>
                      <span className="text-[#22C55E] font-bold">{vizSpeed}ms</span>
                    </div>
                    <input 
                      type="range"
                      min="2"
                      max="150"
                      value={vizSpeed}
                      onChange={(e) => setVizSpeed(parseInt(e.target.value))}
                      className="accent-[#22C55E] bg-zinc-950 h-1 rounded cursor-pointer"
                    />
                  </div>
                  {/* Elapsed Time */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#A3A3A3] uppercase tracking-wider font-semibold">Elapsed time</span>
                    <span className="text-xs font-mono font-semibold text-[#FFFFFF]">{(vizElapsedTime / 10).toFixed(1)}s</span>
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={handlePlayPause}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#22C55E] hover:bg-[#4ADE80] active:bg-[#166534] text-[#050505] font-semibold px-6 py-2 rounded text-xs transition-colors"
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                    {isPlaying ? "Pause animation" : "Start animation"}
                  </button>
                  <button
                    onClick={generateNewVisualizerArray}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#0D0D0D] hover:bg-[#151515] text-[#FFFFFF] border border-[#232323] font-semibold px-6 py-2 rounded text-xs transition-colors"
                  >
                    <RotateCcw size={12} />
                    Reset dataset
                  </button>
                </div>
              </div>
            </div>

            {/* Grid of selected algorithms */}
            <div className={`grid grid-cols-1 ${selectedVizAlgos.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : ""} gap-6`}>
              {selectedVizAlgos.map(algo => {
                const state = vizStates[algo];
                if (!state) return null;
                
                return (
                  <div 
                    key={algo} 
                    className={`bg-[#0D0D0D] border rounded p-5 flex flex-col gap-4 transition-all duration-300 ${
                      state.winner 
                        ? "border-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.15)]" 
                        : "border-[#232323]"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#232323] pb-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#FFFFFF]">
                          {getAlgoDisplayName(algo)}
                        </span>
                        <span className="text-[10px] text-[#A3A3A3]">
                          Current algorithm: <span className="text-[#22C55E] font-medium">{state.currentSubAlgo}</span>
                        </span>
                      </div>
                      {state.winner && (
                        <span className="text-[10px] bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 px-2 py-0.5 rounded font-medium flex items-center gap-1 animate-pulse">
                          ✓ Winner
                        </span>
                      )}
                      {state.done && !state.winner && (
                        <span className="text-[10px] bg-[#151515] text-[#A3A3A3] border border-[#232323] px-2 py-0.5 rounded font-medium">
                          Completed
                        </span>
                      )}
                    </div>

                    {/* Visualizer Canvas (Dominate Layout Height) */}
                    <div className="h-64 flex items-end justify-between gap-0.5 bg-[#050505] p-3 border border-[#232323] rounded">
                      {state.array.map((bar, idx) => {
                        let colorClass = "bg-[#232323]"; // default unsorted
                        if (bar.state === "compare") colorClass = "bg-[#FFFFFF]"; // comparing
                        if (bar.state === "operation") colorClass = "bg-[#22C55E]"; // active (mutating)
                        if (bar.state === "sorted") colorClass = "bg-[#4ADE80]"; // sorted (light green)

                        return (
                          <div 
                            key={idx}
                            className={`flex-1 transition-all duration-75 ${colorClass}`}
                            style={{ height: `${(bar.value / 400) * 100}%` }}
                          />
                        );
                      })}
                    </div>

                    {/* Crossover & Sub-algo Info */}
                    <div className="border-t border-[#232323] pt-3 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-mono">
                        <div className="flex justify-between border-b border-[#232323]/50 pb-1">
                          <span className="text-[#A3A3A3]">Execution state</span>
                          <span className="text-[#FFFFFF] font-semibold">{state.switchStatus}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#232323]/50 pb-1">
                          <span className="text-[#A3A3A3]">Partition size</span>
                          <span className="text-[#FFFFFF] font-semibold">{state.currentPartitionSize}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#232323]/50 pb-1">
                          <span className="text-[#A3A3A3]">Comparisons</span>
                          <span className="text-[#22C55E] font-bold">{state.comparisons.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#232323]/50 pb-1">
                          <span className="text-[#A3A3A3]">Swaps/mutations</span>
                          <span className="text-[#FFFFFF] font-semibold">{state.swaps.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-[#A3A3A3]">Recursion depth</span>
                          <span className="text-[#FFFFFF] font-semibold">{state.depth}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Color Legend (Centered under the grid) */}
            <div className="flex gap-6 text-[10px] font-mono text-[#A3A3A3] justify-center mt-6">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#232323] rounded-full border border-[#737373]"></span> Unsorted (base array)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#FFFFFF] rounded-full"></span> Comparing
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#22C55E] rounded-full"></span> Active (mutating)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#4ADE80] rounded-full"></span> Sorted
              </div>
            </div>
          </div>
        )}

        {/* ── PAGE 4: Analysis ── */}
        {activeTab === "analysis" && (
          <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full py-4 text-xs">
            {/* Algorithm Analysis Profiles */}
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-semibold text-[#FFFFFF] mb-1">Quick + Insertion sort</h3>
                <p className="text-[#A3A3A3] leading-relaxed">
                  Splits partitions recursively using QuickSort. Once partition size drops below the threshold, it invokes Insertion Sort on that range to bypass stack frame overhead and optimize cache locality.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 font-mono text-[11px] text-[#A3A3A3]">
                  <div>
                    <span className="text-[#22C55E] font-semibold">Advantages:</span> Bypasses recursion stack limits for small subarrays. Near-zero initialization latency.
                  </div>
                  <div>
                    <span className="text-[#737373] font-semibold">Disadvantages:</span> Degrades to quadratic O(N²) time complexity under skewed pivot selection on worst-case arrays.
                  </div>
                </div>
                <div className="text-[10px] text-[#737373] mt-2 font-mono">
                  Complexity: Time: O(N log N) average | Space: O(log N)
                </div>
              </div>

              <div className="border-t border-[#232323] pt-6">
                <h3 className="text-sm font-semibold text-[#FFFFFF] mb-1">Quick + Merge sort</h3>
                <p className="text-[#A3A3A3] leading-relaxed">
                  Swaps partitioning routines to an out-of-place Merge Sort when the size drops below threshold limits, providing stable subproblem sorting.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 font-mono text-[11px] text-[#A3A3A3]">
                  <div>
                    <span className="text-[#22C55E] font-semibold">Advantages:</span> Stable sorting on segments, lower overall comparisons compared to insertion on larger thresholds.
                  </div>
                  <div>
                    <span className="text-[#737373] font-semibold">Disadvantages:</span> Requires O(N) auxiliary heap allocations. High array element writes during merge copy operations.
                  </div>
                </div>
                <div className="text-[10px] text-[#737373] mt-2 font-mono">
                  Complexity: Time: O(N log N) average | Space: O(N) auxiliary
                </div>
              </div>

              <div className="border-t border-[#232323] pt-6">
                <h3 className="text-sm font-semibold text-[#FFFFFF] mb-1">Introsort</h3>
                <p className="text-[#A3A3A3] leading-relaxed">
                  Begins with QuickSort, switches to Insertion Sort on tiny subproblems, and transitions to HeapSort if recursion depth exceeds limits.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 font-mono text-[11px] text-[#A3A3A3]">
                  <div>
                    <span className="text-[#22C55E] font-semibold">Advantages:</span> Guarantees O(N log N) worst-case time complexity limit. Safe from quadratic stack collapse.
                  </div>
                  <div>
                    <span className="text-[#737373] font-semibold">Disadvantages:</span> HeapSort limits pivot cache coherence during fallback sequences.
                  </div>
                </div>
                <div className="text-[10px] text-[#737373] mt-2 font-mono">
                  Complexity: Time: O(N log N) bounds | Space: O(log N)
                </div>
              </div>
            </div>

            {/* Complexity Reference & Threshold Analysis */}
            <div className="border-t border-[#232323] pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Complexity Reference Table */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[#FFFFFF]">Complexity comparison reference</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#232323] text-[#A3A3A3] font-semibold text-[10px]">
                        <th className="py-2">Algorithm</th>
                        <th className="py-2">Best case</th>
                        <th className="py-2">Average case</th>
                        <th className="py-2">Worst case</th>
                        <th className="py-2">Space complexity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#232323] font-mono text-[#A3A3A3]">
                      <tr>
                        <td className="py-2 font-sans font-semibold text-[#FFFFFF]">Quick + Insertion</td>
                        <td className="py-2">O(N)</td>
                        <td className="py-2">O(N log N)</td>
                        <td className="py-2">O(N²)</td>
                        <td className="py-2">O(log N)</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-sans font-semibold text-[#FFFFFF]">Quick + Merge</td>
                        <td className="py-2">O(N log N)</td>
                        <td className="py-2">O(N log N)</td>
                        <td className="py-2">O(N²)</td>
                        <td className="py-2">O(N)</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-sans font-semibold text-[#FFFFFF]">Introsort</td>
                        <td className="py-2">O(N)</td>
                        <td className="py-2 text-[#22C55E]">O(N log N)</td>
                        <td className="py-2 text-[#22C55E]">O(N log N)</td>
                        <td className="py-2">O(log N)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Threshold Analysis List */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[#FFFFFF]">Crossover threshold speed curves</h3>
                <p className="text-[#A3A3A3] text-xs leading-relaxed">
                  Runtimes associated with various threshold limits (N = 50,000, Uniform Random, averaged over 5 runs):
                </p>
                <div className="flex flex-col gap-2 font-mono text-xs text-[#A3A3A3]">
                  <div className="flex justify-between border-b border-[#232323] pb-1.5">
                    <span>Threshold = 8</span>
                    <span>4.12 ms (sub-optimal)</span>
                  </div>
                  <div className="flex justify-between border-b border-[#232323] pb-1.5">
                    <span>Threshold = 16</span>
                    <span className="text-[#22C55E] font-bold">3.51 ms (sweet spot)</span>
                  </div>
                  <div className="flex justify-between border-b border-[#232323] pb-1.5">
                    <span>Threshold = 32</span>
                    <span>3.88 ms (moderate overhead)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Threshold = 64</span>
                    <span>4.72 ms (quadratic decay)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dataset Distribution Impact Summary */}
            <div className="border-t border-[#232323] pt-8 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#FFFFFF]">Dataset distribution impact summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="border border-[#232323] bg-[#0D0D0D] p-3 rounded">
                  <strong className="text-[#FFFFFF] block mb-1">Random distribution</strong>
                  <span className="text-[#737373] block mb-2 font-mono">High Entropy</span>
                  <div className="text-[10px] text-[#22C55E] font-bold font-mono">Winner: Introsort</div>
                  <p className="text-[10px] text-[#A3A3A3] mt-1 leading-relaxed">Standard random layouts benefit from QuickSort&apos;s optimal pivot partitioning loops.</p>
                </div>
                <div className="border border-[#232323] bg-[#0D0D0D] p-3 rounded">
                  <strong className="text-[#FFFFFF] block mb-1">Nearly sorted</strong>
                  <span className="text-[#737373] block mb-2 font-mono">Low Inversions</span>
                  <div className="text-[10px] text-[#22C55E] font-bold font-mono">Winner: Quick+Insertion</div>
                  <p className="text-[10px] text-[#A3A3A3] mt-1 leading-relaxed">Insertion Sort base runs in O(N) for presorted runs, avoiding recursive tree builds.</p>
                </div>
                <div className="border border-[#232323] bg-[#0D0D0D] p-3 rounded">
                  <strong className="text-[#FFFFFF] block mb-1">Reverse sorted</strong>
                  <span className="text-[#737373] block mb-2 font-mono">Maximum Inversions</span>
                  <div className="text-[10px] text-[#22C55E] font-bold font-mono">Winner: Introsort</div>
                  <p className="text-[10px] text-[#A3A3A3] mt-1 leading-relaxed">Worst-case pivot selections trigger Introsort&apos;s HeapSort fallback wrapper to keep bounds.</p>
                </div>
                <div className="border border-[#232323] bg-[#0D0D0D] p-3 rounded">
                  <strong className="text-[#FFFFFF] block mb-1">Duplicate heavy</strong>
                  <span className="text-[#737373] block mb-2 font-mono">High Key Collisions</span>
                  <div className="text-[10px] text-[#22C55E] font-bold font-mono">Winner: Quick+Merge</div>
                  <p className="text-[10px] text-[#A3A3A3] mt-1 leading-relaxed">Stable merge sorts process repetitive keys with fewer comparisons than insertions.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

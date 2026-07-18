"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Play, Pause, RotateCcw, BarChart3, Settings, Database, Activity, 
  TrendingUp, BookOpen, Award, Cpu, ArrowRight, ShieldAlert, Zap, 
  History, ChevronRight, ChevronLeft, Check, Lock, Info, SlidersHorizontal, Sparkles
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// Custom Github Icon
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

// Subtle sorting animation background component for Hero
const SubtleSortingBg = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = (canvas.width = canvas.offsetWidth);
      height = (canvas.height = canvas.offsetHeight);
    };
    window.addEventListener("resize", handleResize);

    const numBars = 45;
    const bars: { value: number; currentVal: number }[] = [];
    for (let i = 0; i < numBars; i++) {
      const val = Math.random() * 0.7 + 0.15;
      bars.push({ value: val, currentVal: val });
    }

    let active1 = -1;
    let active2 = -1;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      const barWidth = width / numBars;
      for (let i = 0; i < numBars; i++) {
        bars[i].currentVal += (bars[i].value - bars[i].currentVal) * 0.1;
        const barHeight = bars[i].currentVal * height * 0.75;
        const x = i * barWidth;
        const y = height - barHeight;

        if (i === active1 || i === active2) {
          ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        }
        ctx.fillRect(x + 1.5, y, barWidth - 3, barHeight);
      }

      frame++;
      if (frame % 45 === 0) {
        const idx = Math.floor(Math.random() * (numBars - 1));
        active1 = idx;
        active2 = idx + 1;
        if (bars[idx].value > bars[idx + 1].value) {
          const temp = bars[idx].value;
          bars[idx].value = bars[idx + 1].value;
          bars[idx + 1].value = temp;
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

export default function Home() {
  // Stepper Progression State
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<number>(0);

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

  // Terminal logging simulation
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [telemetryActive, setTelemetryActive] = useState<boolean>(false);

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

  const runTelemetryAnimation = (size: number, rawResults: BenchmarkResult[]) => {
    setTelemetryActive(true);
    const messages = [
      `[INFO] Connecting to native performance kernels...`,
      `[INFO] Target environment: C++17 native compiler`,
      `[INFO] Generating ${datasetType} distribution dataset (N = ${size.toLocaleString()})`,
      `[INFO] Seed value: ${seed} | Average run passes: ${timingRuns}`,
      `[INFO] Commencing benchmark sweeps for: ${selectedAlgos.map(getAlgoDisplayName).join(", ")}`,
      `[INFO] Running pivot strategy: ${pivotStrategy.replace(/_/g, " ")}`,
      `[INFO] Evaluating crossover threshold boundary at: ${threshold} elements`,
      `[SUCCESS] Native hardware cycles collected successfully.`,
      `[SUCCESS] Telemetry verified. Loading analytical workstation...`
    ];

    setTelemetryLogs([messages[0]]);
    let i = 1;
    const interval = setInterval(() => {
      if (i < messages.length) {
        if (messages[i]) {
          setTelemetryLogs(prev => [...prev, messages[i]]);
        }
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setTelemetryActive(false);
          setBenchResults(rawResults);
          setCurrentStep(4);
          if (maxUnlockedStep < 4) setMaxUnlockedStep(4);
        }, 600);
      }
    }, 400);
  };

  const handleRunBenchmark = async () => {
    setBenchLoading(true);
    setBenchError(null);
    setTelemetryActive(true);
    setTelemetryLogs([`[INFO] Starting benchmark build pipeline...`]);
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
      saveToHistory(data.results);
      runTelemetryAnimation(size, data.results);
    } catch (e) {
      const err = e as Error;
      setBenchError(err.message || "An unexpected error occurred during execution.");
      setTelemetryActive(false);
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
  const [vizThreshold, setVizThreshold] = useState<number>(16);

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

  // Sync selected algorithms to the visualizer when moving to visualizer step
  useEffect(() => {
    if (currentStep === 5) {
      setSelectedVizAlgos(selectedAlgos.slice(0, 3));
      setVizThreshold(threshold);
    }
  }, [currentStep, selectedAlgos, threshold]);

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

  // Determine fastest algorithm dynamically
  const getFastestAlgo = () => {
    if (benchResults.length === 0) return null;
    return [...benchResults].reduce((min, cur) => cur.execution_time_ms < min.execution_time_ms ? cur : min, benchResults[0]);
  };

  const getResultsSummaryText = () => {
    const best = getFastestAlgo();
    if (!best) return "";
    const bestName = getAlgoDisplayName(best.algorithm);
    const timeVal = (best.execution_time_ms * 1000).toLocaleString(undefined, { maximumFractionDigits: 1 });
    
    switch (datasetType) {
      case "nearly_sorted":
        return `${bestName} completed faster than all other algorithms on this dataset (${timeVal} μs). By invoking insertion-based base runs on sorted segments, it skipped the recursive stack layers.`;
      case "reverse_sorted":
        return `${bestName} optimized reverse key orientations (${timeVal} μs) by managing pivot choices and swapping to fallback bounds to avoid quadratic slowdowns.`;
      case "duplicate_heavy":
        return `${bestName} outperformed alternative setups with repetitive keys (${timeVal} μs) by using partition balancing loops.`;
      default:
        return `${bestName} achieved the fastest execution run (${timeVal} μs) on this high-entropy dataset.`;
    }
  };

  const getChartExplanationText = () => {
    const best = getFastestAlgo();
    if (!best) return "";
    const bestName = getAlgoDisplayName(best.algorithm);

    if (best.algorithm === "introsort") {
      if (datasetType === "reverse_sorted") {
        return "Introsort achieved optimal bounds by switching partitioning recursion to HeapSort fallback when execution depth exceeded the safety threshold limit.";
      }
      return "Introsort optimized execution by utilizing recursion partitioning for high-entropy bounds and transitioning to Insertion Sort for subproblems.";
    }

    if (best.algorithm === "quick_insertion") {
      if (datasetType === "nearly_sorted") {
        return "Quick + Insertion performed best because Insertion Sort runs in near-linear time on mostly sorted subproblems, avoiding recursive partition overhead.";
      }
      return "Quick + Insertion minimized runtime overhead by bypassing recursive stack splits for partitions below the threshold limit.";
    }

    if (best.algorithm === "quick_merge") {
      if (datasetType === "duplicate_heavy") {
        return "Quick + Merge avoided partitioning bottlenecks for heavy equal-key collisions by utilizing auxiliary out-of-place merge stages.";
      }
      return "Quick + Merge combined partitioning speed with stable, predictable subproblem merging beneath threshold bounds.";
    }

    return `${bestName} performed best under these settings by optimizing local cache localization and execution instruction count.`;
  };

  const stepsList = [
    { id: 0, label: "Introduce" },
    { id: 1, label: "Configure dataset" },
    { id: 2, label: "Pick algorithms" },
    { id: 3, label: "Run benchmark" },
    { id: 4, label: "Compare results" },
    { id: 5, label: "Visualize" },
    { id: 6, label: "Analyze" }
  ];

  const handleStepNavigation = (stepId: number) => {
    if (stepId <= maxUnlockedStep) {
      setCurrentStep(stepId);
      if (stepId !== 5 && animationRef.current) {
        setIsPlaying(false);
        clearInterval(animationRef.current);
      }
    }
  };

  const handleNextStep = () => {
    const next = currentStep + 1;
    setCurrentStep(next);
    if (maxUnlockedStep < next) {
      setMaxUnlockedStep(next);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA] flex flex-col font-sans antialiased text-sm">
      {/* Top Navbar */}
      <header className="border-b border-[#252525] bg-[#050505]/95 backdrop-blur px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div>
            <span className="text-base font-bold tracking-tight block text-[#FAFAFA]">
              SortLab
            </span>
            <span className="text-[11px] text-[#8A8A8A] tracking-tight block font-mono">
              performance workstation
            </span>
          </div>
        </div>

        {/* Stepper Navigation */}
        <nav className="hidden md:flex items-center gap-5">
          {stepsList.map((step, idx) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;
            const isUnlocked = step.id <= maxUnlockedStep;

            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div className={`h-[1px] w-5 ${isCompleted ? "bg-[#22C55E]" : "bg-[#252525]"}`} />
                )}
                <button
                  onClick={() => handleStepNavigation(step.id)}
                  disabled={!isUnlocked}
                  className={`flex items-center gap-2 text-xs md:text-sm py-2 px-1 transition-all duration-150 border-b-2 ${
                    isActive 
                      ? "text-[#FAFAFA] font-semibold cursor-default border-[#22C55E]" 
                      : isCompleted 
                        ? "text-[#22C55E] hover:text-[#4ADE80] cursor-pointer border-transparent" 
                        : isUnlocked
                          ? "text-[#C9C9C9] hover:text-[#FAFAFA] cursor-pointer border-transparent"
                          : "text-[#5A5A5A] cursor-not-allowed border-transparent"
                  }`}
                >
                  <span className="text-[11px] font-mono">
                    {isCompleted ? "✓" : `0${step.id}`}
                  </span>
                  <span>{step.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="flex items-center gap-6">
          {currentStep > 0 && (
            <button
              onClick={() => {
                setCurrentStep(0);
                setMaxUnlockedStep(0);
                setBenchResults([]);
              }}
              className="text-sm text-[#8A8A8A] hover:text-[#FAFAFA] transition-colors font-medium cursor-pointer"
            >
              Reset workbench
            </button>
          )}
          <a 
            href="https://github.com/Unceas/Efficient-Sorting" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-[#8A8A8A] hover:text-[#FAFAFA] transition-colors font-medium"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main workspace container */}
      <main className="flex-1 p-8 md:p-12 max-w-6xl mx-auto w-full flex flex-col justify-start overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* STEP 0: LANDING */}
          {currentStep === 0 && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-14 py-8 max-w-3xl mx-auto w-full"
            >
              {/* Typography Hero */}
              <div className="relative border border-[#252525] bg-[#0D0D0D] rounded-lg p-10 flex flex-col gap-6 text-left items-start w-full overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <SubtleSortingBg />
                </div>

                <div className="relative z-10 flex flex-col gap-4 items-start">
                  <span className="text-[10px] font-mono text-[#22C55E] tracking-wider font-semibold">
                    Performance engineering workstation
                  </span>
                  <h1 className="text-3xl md:text-5xl font-extrabold text-[#FAFAFA] tracking-tight max-w-2xl leading-tight">
                    Sorting, re-engineered for performance.
                  </h1>
                  <p className="text-[#C9C9C9] text-xs max-w-lg leading-relaxed">
                    Empirically analyze crossover thresholds, compile native C++ kernels, and inspect execution telemetry in a guided performance environment.
                  </p>
                  
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setCurrentStep(1);
                        if (maxUnlockedStep < 1) setMaxUnlockedStep(1);
                      }}
                      className="bg-[#FAFAFA] hover:bg-transparent hover:text-[#FAFAFA] border border-[#FAFAFA] hover:border-[#22C55E] text-[#050505] font-semibold px-6 py-2.5 rounded transition-all duration-300 text-xs flex items-center gap-1.5 cursor-pointer emerald-glow hover:emerald-glow-strong"
                    >
                      <span>Begin guided experiment</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Workflow Pipeline timeline */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[#8A8A8A] tracking-wider font-mono text-[9px] font-semibold">Interactive pipeline</span>
                  <h2 className="text-base font-semibold text-[#FAFAFA]">Experiment workflow</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { step: "Configure dataset", desc: "Select distribution settings and sequence limits." },
                    { step: "Pick algorithms", desc: "Identify base frameworks and hybrid target configurations." },
                    { step: "Run native kernels", desc: "Compile C++ and capture clock metrics." },
                    { step: "Compare results", desc: "Examine swaps, compares, and scale curves." },
                    { step: "Visualize & analyze", desc: "Watch recursion limits in real-time." }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2 border-l border-[#252525] pl-4 py-2 hover:border-[#22C55E]/30 transition-colors">
                      <span className="text-[10px] font-mono text-[#22C55E] font-semibold">0{idx + 1}</span>
                      <h3 className="text-xs font-semibold text-[#FAFAFA]">{item.step}</h3>
                      <p className="text-[11px] text-[#8A8A8A] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Preview Mockup */}
              <div className="flex flex-col gap-4 border-t border-[#252525] pt-12">
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[#8A8A8A] tracking-wider font-mono text-[9px] font-semibold">Workspace interface preview</span>
                  <h2 className="text-base font-semibold text-[#FAFAFA]">Product preview</h2>
                </div>
                
                {/* CSS Window Mockup */}
                <div className="border border-[#252525] bg-[#0D0D0D] rounded-lg overflow-hidden flex flex-col">
                  {/* Header Window Controls */}
                  <div className="bg-[#141414] border-b border-[#252525] px-4 py-2 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#252525]" />
                      <span className="w-2 h-2 rounded-full bg-[#252525]" />
                      <span className="w-2 h-2 rounded-full bg-[#252525]" />
                    </div>
                    <span className="text-[10px] font-mono text-[#8A8A8A]">sorting_workstation_telemetry.json</span>
                    <div className="w-8" />
                  </div>
                  
                  {/* Split Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 min-h-[180px]">
                    <div className="border-r border-[#252525] p-4 flex flex-col gap-2 bg-[#0D0D0D] text-[10px] font-mono text-[#C9C9C9]">
                      <span className="text-[#8A8A8A] text-[9px] font-semibold mb-1 tracking-wider">Active setup</span>
                      <div className="flex justify-between border-b border-[#252525]/50 pb-1">
                        <span>Distribution:</span>
                        <span className="text-[#FAFAFA]">Nearly sorted</span>
                      </div>
                      <div className="flex justify-between border-b border-[#252525]/50 pb-1">
                        <span>Data Scale:</span>
                        <span className="text-[#FAFAFA]">10,000 items</span>
                      </div>
                      <div className="flex justify-between border-b border-[#252525]/50 pb-1">
                        <span>Threshold limit:</span>
                        <span className="text-[#FAFAFA]">16 elements</span>
                      </div>
                    </div>
                    <div className="col-span-2 p-4 bg-[#050505] flex flex-col justify-between font-mono text-[10px]">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[#8A8A8A] text-[9px] font-semibold tracking-wider">Performance comparison</span>
                        <div className="flex justify-between text-[#22C55E] bg-[#22C55E]/5 border border-[#22C55E]/20 px-2 py-1.5 rounded">
                          <span>✓ Introsort</span>
                          <span>135.2 μs</span>
                        </div>
                        <div className="flex justify-between text-[#C9C9C9] px-2 py-1.5">
                          <span>Quick + Insertion</span>
                          <span>162.8 μs</span>
                        </div>
                        <div className="flex justify-between text-[#C9C9C9] px-2 py-1.5">
                          <span>MergeSort</span>
                          <span>210.4 μs</span>
                        </div>
                      </div>
                      <span className="text-[8px] text-[#8A8A8A] text-right mt-4">Native C++ process complete</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 1: GENERATE DATASET */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-8 max-w-2xl mx-auto w-full py-6 text-left"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[#22C55E] font-mono text-[10px] tracking-wider font-semibold">Step 1 of 6</span>
                <h2 className="text-xl font-bold tracking-tight text-[#FAFAFA]">Generate distribution dataset</h2>
                <p className="text-[#C9C9C9] text-xs">Choose the key distribution structure and size limit to test your sorting architectures.</p>
              </div>

              {/* Dataset Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: "random", label: "Uniform random", desc: "Standard random distribution. Generates balanced testing scenarios." },
                  { id: "nearly_sorted", label: "Nearly sorted", desc: "Low inversion count. Tests insertion-based hybrid recovery speeds." },
                  { id: "reverse_sorted", label: "Reverse sorted", desc: "Maximum inversion count. Tests pivot logic and heap fallback rules." },
                  { id: "duplicate_heavy", label: "Duplicate heavy", desc: "Repetitive value collections. Checks partition behavior on equal keys." }
                ].map(card => {
                  const isSelected = datasetType === card.id;
                  return (
                    <button
                      key={card.id}
                      onClick={() => setDatasetType(card.id)}
                      className={`text-left p-4 rounded-lg border transition-all duration-300 flex flex-col gap-1.5 cursor-pointer hover-lift ${
                        isSelected 
                          ? "border-[#4ADE80] bg-[#22C55E]/5 text-[#FAFAFA]" 
                          : "border-[#252525] bg-[#0D0D0D] text-[#C9C9C9] hover:border-[#22C55E]/20 hover:text-[#FAFAFA]"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-semibold">{card.label}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#22C55E]" />}
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#8A8A8A]">{card.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dataset Scale Slider */}
                <div className="p-5 border border-[#252525] bg-[#0D0D0D] rounded-lg flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[#8A8A8A] text-[10px] tracking-wider font-semibold">Dataset size (n)</span>
                      <span className="text-base font-bold font-mono text-[#FAFAFA] tracking-tight leading-none">
                        {getDatasetSizeFromExponent(sizeExponent).toLocaleString()}
                      </span>
                    </div>
                    
                    <input 
                      type="range"
                      min="2"
                      max="6"
                      value={sizeExponent}
                      onChange={(e) => setSizeExponent(parseInt(e.target.value))}
                      className="w-full accent-[#22C55E] bg-[#050505] cursor-pointer mt-2"
                    />
                  </div>

                  <div className="flex justify-between text-[9px] text-[#8A8A8A] px-1 font-mono">
                    <span>100</span>
                    <span>1K</span>
                    <span>10K</span>
                    <span>100K</span>
                    <span>1M</span>
                  </div>
                </div>

                {/* Dataset Distribution Preview */}
                <div className="p-5 border border-[#252525] bg-[#0D0D0D] rounded-lg flex flex-col gap-2.5">
                  <span className="text-[#8A8A8A] text-[10px] tracking-wider font-semibold">Distribution preview</span>
                  <div className="h-20 flex items-end justify-between gap-1 bg-[#050505] p-3 border border-[#252525] rounded">
                    {(() => {
                      const data = datasetType === "nearly_sorted" 
                        ? [10, 16, 22, 18, 34, 40, 52, 46, 58, 64, 76, 70, 82, 88, 94, 100]
                        : datasetType === "reverse_sorted"
                        ? [100, 94, 88, 82, 76, 70, 64, 58, 52, 46, 40, 34, 28, 22, 16, 10]
                        : datasetType === "duplicate_heavy"
                        ? [30, 80, 30, 50, 80, 50, 30, 80, 50, 30, 80, 50, 30, 80, 50, 30]
                        : [40, 75, 20, 90, 50, 30, 85, 15, 60, 45, 95, 35, 70, 10, 80, 55];
                      return data.map((val, idx) => (
                        <div 
                          key={idx} 
                          className="flex-1 bg-[#22C55E]/40 border border-[#22C55E]/20 transition-all duration-300"
                          style={{ height: `${val}%` }}
                        />
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={handlePrevStep}
                  className="px-4 py-2 border border-[#252525] hover:border-[#8A8A8A] hover:text-[#FAFAFA] text-[#C9C9C9] transition-colors rounded text-xs cursor-pointer font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="bg-[#FAFAFA] hover:bg-transparent hover:text-[#FAFAFA] border border-[#FAFAFA] hover:border-[#22C55E] text-[#050505] font-semibold px-6 py-2.5 rounded transition-all duration-300 text-xs flex items-center gap-1.5 cursor-pointer emerald-glow hover:emerald-glow-strong"
                >
                  <span>Select algorithms</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: SELECT ALGORITHMS */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-8 max-w-2xl mx-auto w-full py-6 text-left"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[#22C55E] font-mono text-[10px] tracking-wider font-semibold">Step 2 of 6</span>
                <h2 className="text-xl font-bold tracking-tight text-[#FAFAFA]">Select testing candidates</h2>
                <p className="text-[#C9C9C9] text-xs">Identify target framework setups and hybrid logic chains to evaluate side-by-side.</p>
              </div>

              {/* Algorithms Cards Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "quicksort", name: "QuickSort", desc: "Classic O(N log N) recursive partitioning logic." },
                  { id: "mergesort", name: "MergeSort", desc: "Stable sorting array writes. Consistent O(N log N) complexity." },
                  { id: "heapsort", name: "HeapSort", desc: "In-place pivot-independent comparison limits." },
                  { id: "quick_insertion", name: "Quick + Insertion", desc: "Hybrid model: Partition shifts to insertion sort at threshold bounds." },
                  { id: "quick_merge", name: "Quick + Merge", desc: "Hybrid model: Swap partitioning to merge sort below threshold bounds." },
                  { id: "introsort", name: "Introsort", desc: "Hybrid model: QuickSort, with Insertion bounds and HeapSort recursion safety." }
                ].map(algo => {
                  const isChecked = selectedAlgos.includes(algo.id);
                  return (
                    <button
                      key={algo.id}
                      onClick={() => toggleAlgoSelection(algo.id)}
                      className={`text-left p-3.5 rounded-lg border transition-all duration-200 flex items-start gap-3 cursor-pointer ${
                        isChecked 
                          ? "border-[#4ADE80] bg-[#22C55E]/5 text-[#FAFAFA]" 
                          : "border-[#252525] bg-[#0D0D0D] text-[#C9C9C9] hover:border-[#22C55E]/20 hover:text-[#FAFAFA]"
                      }`}
                    >
                      <div className="mt-0.5">
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                          isChecked ? "bg-[#22C55E] border-[#22C55E]" : "border-[#5A5A5A] bg-[#050505]"
                        }`}>
                          {isChecked && <Check size={10} className="text-[#050505] stroke-[3]" />}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold">{algo.name}</span>
                        <p className="text-[11px] leading-relaxed text-[#8A8A8A]">{algo.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Conversational summary */}
              <div className="flex items-center gap-3 p-4 border border-[#252525] bg-[#0D0D0D] rounded-lg">
                <p className="text-xs text-[#C9C9C9] leading-relaxed">
                  Comparing <strong className="text-[#FAFAFA] font-semibold">{selectedAlgos.length} algorithms</strong> on a <strong className="text-[#FAFAFA] font-semibold">{datasetType.replace("_", " ")}</strong> dataset of scale <strong className="text-[#FAFAFA] font-semibold">{getDatasetSizeFromExponent(sizeExponent).toLocaleString()}</strong>.
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={handlePrevStep}
                  className="px-4 py-2 border border-[#252525] hover:border-[#8A8A8A] hover:text-[#FAFAFA] text-[#C9C9C9] transition-colors rounded text-xs cursor-pointer font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={selectedAlgos.length === 0}
                  className="bg-[#FAFAFA] hover:bg-transparent hover:text-[#FAFAFA] border border-[#FAFAFA] hover:border-[#22C55E] text-[#050505] font-semibold px-6 py-2.5 rounded transition-all duration-300 text-xs flex items-center gap-1.5 disabled:bg-[#252525] disabled:text-[#5A5A5A] disabled:border-[#252525] disabled:cursor-not-allowed disabled:shadow-none cursor-pointer font-medium hover:disabled:text-[#5A5A5A] hover:disabled:bg-[#252525] hover:disabled:border-[#252525]"
                >
                  <span>Configure settings</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: ADVANCED CONFIGURATION & EXECUTION */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6 max-w-2xl mx-auto w-full py-6 text-left"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[#22C55E] font-mono text-[10px] tracking-wider font-semibold">Step 3 of 6</span>
                <h2 className="text-xl font-bold tracking-tight text-[#FAFAFA]">Run benchmark</h2>
                <p className="text-[#C9C9C9] text-xs">Configure parameters and run native C++ execution sweeps.</p>
              </div>

              {/* Active Workspace Setup Summary */}
              <div className="border border-[#252525] bg-[#0D0D0D] rounded-lg p-4 flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between items-center border-b border-[#252525]/50 pb-2">
                  <span className="text-xs font-semibold text-[#FAFAFA]">Active experiment setup</span>
                  <span className="text-[10px] text-[#8A8A8A] font-mono">Steps 1–2 configuration</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-[10px] text-[#C9C9C9]">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#8A8A8A] font-sans">Dataset structure</span>
                    <span className="text-[#FAFAFA] font-semibold">{datasetType.replace("_", " ")}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#8A8A8A] font-sans">Dataset size (n)</span>
                    <span className="text-[#FAFAFA] font-semibold">{getDatasetSizeFromExponent(sizeExponent).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#8A8A8A] font-sans">Selected algorithms</span>
                    <span className="text-[#FAFAFA] font-semibold truncate" title={selectedAlgos.map(a => getAlgoDisplayName(a)).join(", ")}>
                      {selectedAlgos.map(a => getAlgoDisplayName(a)).join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Configuration parameters */}
              <div className="border border-[#252525] bg-[#0D0D0D] rounded-lg p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-[#252525]/50 pb-2">
                  <span className="text-xs font-semibold text-[#FAFAFA]">Execution parameters</span>
                  <span className="text-[10px] text-[#8A8A8A] font-mono">Customizable settings</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Crossover Threshold */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#8A8A8A] text-[10px] tracking-wider font-semibold">Crossover threshold</label>
                    <select
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value))}
                      className="bg-[#050505] border border-[#252525] hover:border-[#22C55E]/50 rounded px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#22C55E] text-xs transition duration-150 cursor-pointer"
                    >
                      <option value={8}>8 elements</option>
                      <option value={16}>16 elements (sweet spot)</option>
                      <option value={32}>32 elements</option>
                      <option value={64}>64 elements</option>
                    </select>
                  </div>

                  {/* Pivot Strategy */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#8A8A8A] text-[10px] tracking-wider font-semibold">Pivot selection rule</label>
                    <select
                      value={pivotStrategy}
                      onChange={(e) => setPivotStrategy(e.target.value)}
                      className="bg-[#050505] border border-[#252525] hover:border-[#22C55E]/50 rounded px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#22C55E] text-xs transition duration-150 cursor-pointer"
                    >
                      <option value="first">First element</option>
                      <option value="random">Random index</option>
                      <option value="median_of_three">Median of three</option>
                    </select>
                  </div>

                  {/* Seed */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#8A8A8A] text-[10px] tracking-wider font-semibold">Random generator seed</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
                      className="bg-[#050505] border border-[#252525] hover:border-[#22C55E]/50 rounded px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#22C55E] text-xs transition duration-150"
                    />
                  </div>

                  {/* Timing Runs */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#8A8A8A] text-[10px] tracking-wider font-semibold">Average run passes</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={timingRuns}
                      onChange={(e) => setTimingRuns(parseInt(e.target.value) || 5)}
                      className="bg-[#050505] border border-[#252525] hover:border-[#22C55E]/50 rounded px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#22C55E] text-xs transition duration-150"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-col gap-4 mt-2">
                {!telemetryActive && !benchLoading ? (
                  <button
                    onClick={handleRunBenchmark}
                    className="w-full flex items-center justify-center bg-[#FAFAFA] hover:bg-transparent hover:text-[#FAFAFA] border border-[#FAFAFA] hover:border-[#22C55E] text-[#050505] font-bold py-3.5 rounded-lg transition-all duration-300 text-xs emerald-glow hover:emerald-glow-strong cursor-pointer"
                  >
                    <span>Run benchmark</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 justify-center py-2">
                      <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-ping" />
                      <span className="text-xs text-[#22C55E] font-mono">Running benchmark...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* API error view */}
              {benchError && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] p-4 rounded-md text-xs flex items-center gap-2">
                  <ShieldAlert size={14} />
                  <span>{benchError}</span>
                </div>
              )}

              {/* Telemetry log simulator console */}
              {(telemetryActive || telemetryLogs.length > 0) && (
                <div className="bg-[#050505] border border-[#252525] rounded-lg p-4 font-mono text-[11px] text-[#C9C9C9] flex flex-col gap-1.5 min-h-[190px] justify-start shadow-inner">
                  <div className="flex justify-between items-center border-b border-[#252525]/30 pb-1.5 mb-1.5 text-[9px] text-[#8A8A8A]">
                    <span>Workstation diagnostics</span>
                    <span>Active port: 8000</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[160px]">
                    {telemetryLogs.map((log, idx) => (
                      <div key={idx} className={log && typeof log === "string" && log.startsWith("[SUCCESS]") ? "text-[#22C55E]" : "text-[#C9C9C9]"}>
                        {log}
                      </div>
                    ))}
                    {telemetryActive && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-3 bg-[#22C55E] animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Back button */}
              {!benchLoading && !telemetryActive && (
                <div className="flex justify-start">
                  <button
                    onClick={handlePrevStep}
                    className="px-4 py-2 border border-[#252525] hover:border-[#8A8A8A] hover:text-[#FAFAFA] text-[#C9C9C9] transition-colors rounded text-xs cursor-pointer font-medium"
                  >
                    Back
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: VIEW RESULTS & CHARTS */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-8 w-full py-4 animate-slideup animate-once text-left"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[#22C55E] font-mono text-[10px] tracking-wider font-semibold">Step 4 of 6</span>
                <h2 className="text-xl font-bold tracking-tight text-[#FAFAFA]">Compare results</h2>
                <p className="text-[#C9C9C9] text-xs">Analyze native execution runtimes, instruction comparisons, and space scaling curves.</p>
              </div>

              {/* Terminal Diagnostics Winner Panel */}
              {benchResults.length > 0 && (
                <div className="border border-[#252525] bg-[#050505] rounded-lg p-4 font-mono text-xs flex flex-col gap-2 shadow-inner">
                  <div className="flex justify-between items-center border-b border-[#252525]/50 pb-2 text-[10px] text-[#8A8A8A]">
                    <span>KERNEL_DIAGNOSTICS_LOG</span>
                    <span>STATUS: ANALYSIS_SUCCESS</span>
                  </div>
                  <div className="flex flex-col gap-1 text-[#C9C9C9]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#8A8A8A]">$</span>
                      <span>cat winner_telemetry.log</span>
                    </div>
                    <div className="text-[#FAFAFA] font-bold mt-1">
                      FASTEST PIPELINE: {getAlgoDisplayName(getFastestAlgo()?.algorithm || "").toUpperCase()}
                    </div>
                    <div className="text-[#22C55E] mt-0.5 leading-relaxed">
                      {getResultsSummaryText()}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Results Metrics Table */}
                <div className="lg:col-span-2 border border-[#252525] bg-[#0D0D0D] rounded-lg p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-[#252525] pb-2">
                    <span className="text-xs font-semibold text-[#FAFAFA]">Algorithm execution telemetry</span>
                    <span className="text-[10px] text-[#8A8A8A] font-mono">Dataset size: {getDatasetSizeFromExponent(sizeExponent).toLocaleString()}</span>
                  </div>

                  {benchResults.length === 0 ? (
                    <div className="text-center py-12 text-[#8A8A8A] italic text-xs">
                      No active benchmark data. Configure parameters and run benchmark to compile records.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#252525] text-[#8A8A8A] font-semibold text-[10px]">
                            <th className="py-2 px-3">Algorithm</th>
                            <th className="py-2 px-3 text-right">Runtime (μs)</th>
                            <th className="py-2 px-3 text-right">Comparisons</th>
                            <th className="py-2 px-3 text-right">Swaps / writes</th>
                            <th className="py-2 px-3 text-right">Memory (B)</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-[#C9C9C9]">
                          {benchResults.map((r, idx) => {
                            const best = getFastestAlgo();
                            const isFastest = r.algorithm === best?.algorithm;
                            const rowBg = isFastest ? "hover:bg-[#141414]/40 text-[#FAFAFA]" : "hover:bg-[#141414]/40";
                            const borderCell = (pos: "first" | "middle" | "last") => {
                              if (!isFastest) return "border-b border-[#252525]/30 py-3 px-3";
                              if (pos === "first") return "border-t border-b border-l border-[#22C55E] py-3 px-3 text-[#22C55E] font-bold";
                              if (pos === "last") return "border-t border-b border-r border-[#22C55E] py-3 px-3 text-[#FAFAFA]";
                              return "border-t border-b border-[#22C55E] py-3 px-3 text-[#FAFAFA]";
                            };

                            return (
                              <tr key={idx} className={`${rowBg} transition-colors`}>
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
                  )}
                </div>

                {/* Local experiment run history sidebar */}
                <div className="border border-[#252525] bg-[#0D0D0D] rounded-lg p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[#252525] pb-2">
                    <span className="text-xs font-semibold text-[#FAFAFA]">Local run logs</span>
                    {runHistory.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="text-[10px] text-[#22C55E] hover:underline font-semibold cursor-pointer"
                      >
                        Clear logs
                      </button>
                    )}
                  </div>
                  
                  {runHistory.length === 0 ? (
                    <div className="text-center py-10 text-[#8A8A8A] italic text-[11px]">
                      No historical runs stored yet.
                    </div>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto text-[11px] font-mono flex flex-col gap-2.5 pr-1">
                      {runHistory.slice(0, 10).map(h => (
                        <div key={h.id} className="flex justify-between items-center py-1 border-b border-[#252525]/30 text-[#C9C9C9]">
                          <span className="truncate max-w-[120px]">{h.dataset} (n={h.size})</span>
                          <span>{getAlgoDisplayName(h.algorithm)}: <strong className="text-[#22C55E]">{(h.runtime_ms * 1000).toFixed(0)} μs</strong></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Performance charts section */}
              {benchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#252525] pt-8">
                  {/* Runtime Bar Chart */}
                  <div className="border border-[#252525] bg-[#0D0D0D] rounded-lg p-5">
                    <h4 className="text-xs font-semibold text-[#C9C9C9] mb-4">Runtime comparison (μs)</h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={benchResults.map(r => ({ ...r, runtime_us: r.execution_time_ms * 1000 }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
                          <XAxis dataKey="algorithm" stroke="#8A8A8A" tickFormatter={(v) => v.replace("quick_", "Q+").replace("sort", "")} style={{ fontSize: 9 }} />
                          <YAxis stroke="#8A8A8A" style={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#252525', fontSize: 10, color: '#FAFAFA' }} />
                          <Bar dataKey="runtime_us" name="Time (μs)" radius={[2, 2, 0, 0]}>
                            {benchResults.map((entry, index) => {
                              const isFastest = entry.algorithm === getFastestAlgo()?.algorithm;
                              return <Cell key={`cell-${index}`} fill={isFastest ? "#22C55E" : "#141414"} stroke={isFastest ? "#22C55E" : "#252525"} strokeWidth={1} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Scale Line Chart */}
                  <div className="border border-[#252525] bg-[#0D0D0D] rounded-lg p-5">
                    <h4 className="text-xs font-semibold text-[#C9C9C9] mb-4">Complexity reference curve (runtime scaling)</h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { size: "100", quicksort: 5, mergesort: 8, heapsort: 9, introsort: 4 },
                          { size: "1K", quicksort: 65, mergesort: 92, heapsort: 104, introsort: 55 },
                          { size: "10K", quicksort: 780, mergesort: 1100, heapsort: 1250, introsort: 680 },
                          { size: "100K", quicksort: 9100, mergesort: 13200, heapsort: 14800, introsort: 8100 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
                          <XAxis dataKey="size" stroke="#8A8A8A" style={{ fontSize: 9 }} />
                          <YAxis stroke="#8A8A8A" style={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#252525', fontSize: 10, color: '#FAFAFA' }} />
                          <Line type="monotone" dataKey="introsort" stroke="#22C55E" strokeWidth={1.5} name="Introsort" dot={false} />
                          <Line type="monotone" dataKey="quicksort" stroke="#5A5A5A" strokeWidth={1.2} name="Quick" dot={false} />
                          <Line type="monotone" dataKey="mergesort" stroke="#8A8A8A" strokeWidth={1.2} name="Merge" dot={false} />
                          <Line type="monotone" dataKey="heapsort" stroke="#252525" strokeWidth={1.2} name="Heap" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Chart explanation annotation */}
              {benchResults.length > 0 && (
                <div className="border border-[#252525] bg-[#0D0D0D] p-4 rounded-lg flex flex-col gap-1 text-xs">
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-[#8A8A8A] font-mono">Performance observation</span>
                  <p className="text-[#C9C9C9] leading-relaxed">
                    {getChartExplanationText()}
                  </p>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-[#252525]">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 border border-[#252525] hover:border-[#8A8A8A] hover:text-[#FAFAFA] text-[#C9C9C9] transition-colors rounded text-xs cursor-pointer font-medium"
                >
                  Configure parameters
                </button>
                <button
                  onClick={handleNextStep}
                  className="bg-[#FAFAFA] hover:bg-transparent hover:text-[#FAFAFA] border border-[#FAFAFA] hover:border-[#22C55E] text-[#050505] font-semibold px-6 py-2.5 rounded transition-all duration-300 text-xs flex items-center gap-1.5 cursor-pointer emerald-glow hover:emerald-glow-strong font-medium"
                >
                  <span>Visualize execution transitions</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: SORTING VISUALIZER */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6 w-full py-4 text-left"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#252525] pb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[#22C55E] font-mono text-[10px] tracking-wider font-semibold">Step 5 of 6</span>
                  <h2 className="text-xl font-bold tracking-tight text-[#FAFAFA]">Visualize execution</h2>
                  <p className="text-[#C9C9C9] text-xs">Observe side-by-side array partitions swapping execution limits based on set threshold criteria.</p>
                </div>

                {/* Mini Player Controls */}
                <div className="flex items-center gap-2.5 bg-[#0D0D0D] border border-[#252525] p-1.5 rounded-lg">
                  <button
                    onClick={handlePlayPause}
                    className="p-2 bg-[#FAFAFA] hover:bg-[#C9C9C9] text-[#050505] rounded transition-all duration-150 cursor-pointer text-xs flex items-center gap-1.5 font-semibold"
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                    <span>{isPlaying ? "Pause" : "Play simulation"}</span>
                  </button>
                  <button
                    onClick={generateNewVisualizerArray}
                    className="p-2 border border-[#252525] hover:border-[#8A8A8A] hover:text-[#FAFAFA] rounded text-[#C9C9C9] transition-colors cursor-pointer"
                    title="Reset simulation dataset"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>

              {/* Main Visualizer Controls Shelf */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-[#252525] bg-[#0D0D0D] rounded-lg text-xs">
                {/* Visualizer Delay */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[9px] text-[#8A8A8A] tracking-wider font-semibold">
                    <span>Animation delay</span>
                    <span className="text-[#22C55E] font-bold font-mono">{vizSpeed}ms</span>
                  </div>
                  <input 
                    type="range"
                    min="2"
                    max="150"
                    value={vizSpeed}
                    onChange={(e) => setVizSpeed(parseInt(e.target.value))}
                    className="w-full accent-[#22C55E] bg-[#050505] cursor-pointer"
                  />
                </div>

                {/* Array size */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[9px] text-[#8A8A8A] tracking-wider font-semibold">
                    <span>Array scale</span>
                    <span className="text-[#22C55E] font-bold font-mono">{vizSize}</span>
                  </div>
                  <input 
                    type="range"
                    min="15"
                    max="80"
                    value={vizSize}
                    onChange={(e) => setVizSize(parseInt(e.target.value))}
                    className="w-full accent-[#22C55E] bg-[#050505] cursor-pointer"
                  />
                </div>

                {/* Crossover Threshold */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[9px] text-[#8A8A8A] tracking-wider font-semibold">
                    <span>Crossover threshold</span>
                    <span className="text-[#22C55E] font-bold font-mono">{vizThreshold}</span>
                  </div>
                  <input 
                    type="range"
                    min="4"
                    max="35"
                    value={vizThreshold}
                    onChange={(e) => setVizThreshold(parseInt(e.target.value))}
                    className="w-full accent-[#22C55E] bg-[#050505] cursor-pointer"
                  />
                </div>

                {/* Duration info */}
                <div className="flex flex-col justify-end bg-[#050505] p-2 border border-[#252525] rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-[#8A8A8A] font-mono">Elapsed time:</span>
                    <span className="text-xs font-mono font-bold text-[#FAFAFA]">{(vizElapsedTime / 10).toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              {/* Dominating Visualizer Side-by-Side Area */}
              <div className={`grid grid-cols-1 ${selectedVizAlgos.length > 1 ? "md:grid-cols-2 lg:grid-cols-3" : ""} gap-6`}>
                {selectedVizAlgos.map(algo => {
                  const state = vizStates[algo];
                  if (!state) return null;
                  
                  return (
                    <div 
                      key={algo} 
                      className={`border rounded-lg p-4 flex flex-col gap-3 transition-all duration-300 bg-[#0D0D0D] ${
                        state.winner 
                          ? "border-[#4ADE80] shadow-[0_0_20px_rgba(34,197,94,0.08)]" 
                          : "border-[#252525]"
                      }`}
                    >
                      {/* Grid card header info */}
                      <div className="flex items-center justify-between border-b border-[#252525] pb-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#FAFAFA]">
                            {getAlgoDisplayName(algo)}
                          </span>
                          <span className="text-[10px] text-[#8A8A8A]">
                            Sub-routine: <span className="text-[#22C55E] font-medium font-mono">{state.currentSubAlgo}</span>
                          </span>
                        </div>
                        {state.winner && (
                          <span className="text-[9px] bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 px-2 py-0.5 rounded font-semibold animate-pulse">
                            ✓ Winner
                          </span>
                        )}
                        {state.done && !state.winner && (
                          <span className="text-[9px] bg-[#141414] text-[#8A8A8A] border border-[#252525] px-2 py-0.5 rounded font-mono">
                            Completed
                          </span>
                        )}
                      </div>

                      {/* Dominate Visualizer Bar charts height */}
                      <div className="h-64 flex items-end justify-between gap-0.5 bg-[#050505] p-4 border border-[#252525] rounded-md relative overflow-hidden">
                        {state.array.map((bar, idx) => {
                          let colorClass = "bg-[#252525]"; // default unsorted (grayscale)
                          if (bar.state === "compare") colorClass = "bg-[#FAFAFA]"; // comparing (white)
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

                      {/* State metadata */}
                      <div className="border-t border-[#252525]/50 pt-2 flex flex-col gap-1.5 text-[10px] font-mono text-[#C9C9C9]">
                        <div className="flex justify-between border-b border-[#252525]/30 pb-1">
                          <span>Partition size:</span>
                          <span className="text-[#FAFAFA] font-semibold">{state.currentPartitionSize}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#252525]/30 pb-1">
                          <span>Comparisons:</span>
                          <span className="text-[#22C55E] font-bold">{state.comparisons.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#252525]/30 pb-1">
                          <span>Swaps/Writes:</span>
                          <span className="text-[#FAFAFA]">{state.swaps.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recursion depth:</span>
                          <span className="text-[#FAFAFA]">{state.depth}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Color Legend */}
              <div className="flex gap-6 text-[10px] font-mono text-[#8A8A8A] justify-center mt-3 border-t border-[#252525] pt-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#252525] rounded"></span> Unsorted array
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#FAFAFA] rounded"></span> Comparing index
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#22C55E] rounded"></span> Active partition operation
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#4ADE80] rounded"></span> Sorted segment
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-[#252525]">
                <button
                  onClick={handlePrevStep}
                  className="px-4 py-2 border border-[#252525] hover:border-[#8A8A8A] hover:text-[#FAFAFA] text-[#C9C9C9] transition-colors rounded text-xs cursor-pointer font-medium"
                >
                  Back to results
                </button>
                <button
                  onClick={handleNextStep}
                  className="bg-[#FAFAFA] hover:bg-transparent hover:text-[#FAFAFA] border border-[#FAFAFA] hover:border-[#22C55E] text-[#050505] font-semibold px-6 py-2.5 rounded transition-all duration-300 text-xs flex items-center gap-1.5 cursor-pointer emerald-glow hover:emerald-glow-strong font-medium"
                >
                  <span>Verify analysis conclusions</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: ANALYZE & LEARN */}
          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-8 max-w-4xl mx-auto w-full py-6 text-left"
            >
              <div className="flex flex-col gap-1 border-b border-[#252525] pb-4">
                <span className="text-[#22C55E] font-mono text-[10px] tracking-wider font-semibold">Step 6 of 6</span>
                <h2 className="text-xl font-bold tracking-tight text-[#FAFAFA]">Analyze performance</h2>
                <p className="text-[#C9C9C9] text-xs">Examine the mathematical conclusions and hardware architecture trade-offs verified in your experiment.</p>
              </div>

              {/* Question 1: Dynamic Winner Summary */}
              <div className="flex flex-col gap-2 bg-[#0D0D0D] border border-[#252525] p-5 rounded-lg">
                <h3 className="text-xs font-semibold text-[#FAFAFA]">
                  Why did {getAlgoDisplayName(getFastestAlgo()?.algorithm || "Introsort")} perform better in this run?
                </h3>
                <div className="text-xs text-[#C9C9C9] leading-relaxed flex flex-col gap-2">
                  <p>
                    On the selected <strong className="text-[#FAFAFA] font-semibold">{datasetType.replace("_", " ")}</strong> dataset (scale n={getDatasetSizeFromExponent(sizeExponent).toLocaleString()}), {getAlgoDisplayName(getFastestAlgo()?.algorithm || "Introsort")} minimized execution cycles by dynamically swapping sorting routines.
                  </p>
                  <p>
                    For large ranges, recursive partitioning quickly narrows down sorting partitions. Once subproblems fit comfortably within cache line limits, transitioning to non-recursive base sorting (like Insertion Sort) avoids stack frame storage allocations.
                  </p>
                </div>
              </div>

              {/* Structured Hybrid Architecture Columns */}
              <div className="flex flex-col gap-4 border-t border-[#252525] pt-8">
                <h3 className="text-xs font-semibold text-[#FAFAFA]">Hybrid architecture profiles</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1: Quick + Insertion */}
                  <div className="border border-[#252525] bg-[#0D0D0D] p-5 rounded-lg flex flex-col justify-between hover:border-[#22C55E]/20 transition-colors">
                    <div className="flex flex-col gap-3">
                      <div>
                        <strong className="text-xs text-[#FAFAFA] block">Quick + Insertion</strong>
                        <span className="text-[9px] text-[#8A8A8A] font-mono">In-place threshold hybrid</span>
                      </div>
                      <div className="border-b border-[#252525] my-1" />
                      <div className="flex flex-col gap-2.5 text-[11px] leading-relaxed text-[#C9C9C9]">
                        <p>
                          <strong className="text-[#FAFAFA] font-medium block mb-0.5">Overview</strong>
                          Partitions down to crossover threshold, stopping recursion early. Final pass of Insertion Sort cleans remaining inversions.
                        </p>
                        <p>
                          <strong className="text-[#FAFAFA] font-medium block mb-0.5">Advantages</strong>
                          Extremely low stack frame memory overhead; optimizes cache utilization for local sub-arrays.
                        </p>
                        <p>
                          <strong className="text-[#FAFAFA] font-medium block mb-0.5">Disadvantages</strong>
                          Unstable sort. Bad pivot choices on pre-sorted sets degrade runtime to quadratic $O(n^2)$.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-[#252525]/50 flex flex-col gap-1.5 text-[10px] font-mono text-[#8A8A8A]">
                      <div className="flex justify-between">
                        <span>Best case:</span>
                        <span className="text-[#22C55E]">O(n)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average:</span>
                        <span className="text-[#FAFAFA]">O(n log n)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Worst case:</span>
                        <span>O(n²)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Space:</span>
                        <span className="text-[#FAFAFA]">O(log n)</span>
                      </div>
                      <div className="mt-1 flex justify-between font-sans">
                        <span>Use case:</span>
                        <span className="text-[#FAFAFA] text-right">In-place sort of random sets</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Quick + Merge */}
                  <div className="border border-[#252525] bg-[#0D0D0D] p-5 rounded-lg flex flex-col justify-between hover:border-[#22C55E]/20 transition-colors">
                    <div className="flex flex-col gap-3">
                      <div>
                        <strong className="text-xs text-[#FAFAFA] block">Quick + Merge</strong>
                        <span className="text-[9px] text-[#8A8A8A] font-mono">Stable partition hybrid</span>
                      </div>
                      <div className="border-b border-[#252525] my-1" />
                      <div className="flex flex-col gap-2.5 text-[11px] leading-relaxed text-[#C9C9C9]">
                        <p>
                          <strong className="text-[#FAFAFA] font-medium block mb-0.5">Overview</strong>
                          Recursive pivot partitioning delegates to stable MergeSort once sub-array sizes fall below the threshold.
                        </p>
                        <p>
                          <strong className="text-[#FAFAFA] font-medium block mb-0.5">Advantages</strong>
                          Ensures stable relative order of duplicate elements within local sub-partitions.
                        </p>
                        <p>
                          <strong className="text-[#FAFAFA] font-medium block mb-0.5">Disadvantages</strong>
                          Demands $O(n)$ auxiliary workspace allocations, creating allocation bottlenecks at scale.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-[#252525]/50 flex flex-col gap-1.5 text-[10px] font-mono text-[#8A8A8A]">
                      <div className="flex justify-between">
                        <span>Best case:</span>
                        <span className="text-[#FAFAFA]">O(n log n)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average:</span>
                        <span className="text-[#FAFAFA]">O(n log n)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Worst case:</span>
                        <span>O(n²)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Space:</span>
                        <span className="text-[#FAFAFA]">O(n) aux</span>
                      </div>
                      <div className="mt-1 flex justify-between font-sans">
                        <span>Use case:</span>
                        <span className="text-[#FAFAFA] text-right">Stable sorting with extra RAM</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Introsort */}
                  <div className="border border-[#252525] bg-[#0D0D0D] p-5 rounded-lg flex flex-col justify-between hover:border-[#22C55E]/20 transition-colors">
                    <div className="flex flex-col gap-3">
                      <div>
                        <strong className="text-xs text-[#FAFAFA] block">Introsort</strong>
                        <span className="text-[9px] text-[#8A8A8A] font-mono">Three-way defensive hybrid</span>
                      </div>
                      <div className="border-b border-[#252525] my-1" />
                      <div className="flex flex-col gap-2.5 text-[11px] leading-relaxed text-[#C9C9C9]">
                        <p>
                          <strong className="text-[#FAFAFA] font-medium block mb-0.5">Overview</strong>
                          Starts with QuickSort. Switches to HeapSort if recursion depth hits limit; transitions to Insertion Sort below threshold.
                        </p>
                        <p>
                          <strong className="text-[#FAFAFA] font-medium block mb-0.5">Advantages</strong>
                          Guarantees $O(n \log n)$ worst-case bounds while maintaining standard QuickSort average speeds.
                        </p>
                        <p>
                          <strong className="text-[#FAFAFA] font-medium block mb-0.5">Disadvantages</strong>
                          Unstable sort. Slightly higher constant factor overhead than pure Quick + Insertion.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-[#252525]/50 flex flex-col gap-1.5 text-[10px] font-mono text-[#8A8A8A]">
                      <div className="flex justify-between">
                        <span>Best case:</span>
                        <span className="text-[#22C55E]">O(n)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average:</span>
                        <span className="text-[#22C55E]">O(n log n)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Worst case:</span>
                        <span className="text-[#22C55E]">O(n log n)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Space:</span>
                        <span className="text-[#FAFAFA]">O(log n)</span>
                      </div>
                      <div className="mt-1 flex justify-between font-sans">
                        <span>Use case:</span>
                        <span className="text-[#FAFAFA] text-right">Standard library routines</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Empirical Crossover Threshold Analysis */}
              <div className="border-t border-[#252525] pt-8 flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-[#FAFAFA]">Empirical crossover threshold analysis</h3>
                <p className="text-xs text-[#C9C9C9] leading-relaxed">
                  The crossover threshold (configured at <span className="font-mono text-[#FAFAFA]">{threshold}</span> elements in your benchmark) determines when recursive subproblems transition to insertion-based sorting. 
                  Lower thresholds increase recursion stack frames and function call overhead. Higher thresholds force the $O(n^2)$ insertion sort to execute on excessively large partitions, degrading overall runtime. 
                  Empirically, a threshold of <span className="font-mono text-[#FAFAFA]">16</span> coordinates best with standard L1 data cache lines (typically 64 bytes), minimizing memory cache misses and maximizing processing throughput.
                </p>
              </div>

              {/* Dataset Distribution Impact Summary Grid */}
              <div className="border-t border-[#252525] pt-8 flex flex-col gap-4">
                <h3 className="text-xs font-semibold text-[#FAFAFA]">Dataset distribution impact matrix</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="border border-[#252525] bg-[#0D0D0D] p-3.5 rounded-lg flex flex-col gap-1 hover:border-[#22C55E]/20 transition-colors">
                    <strong className="text-[#FAFAFA] block">Random uniform</strong>
                    <span className="text-[10px] text-[#8A8A8A] font-mono mb-1">High Entropy</span>
                    <span className="text-[10px] text-[#22C55E] font-bold font-mono">Winner: Introsort</span>
                    <p className="text-[10px] text-[#8A8A8A] leading-relaxed mt-1">Benefited by quick balanced recursive partition splits.</p>
                  </div>
                  <div className="border border-[#252525] bg-[#0D0D0D] p-3.5 rounded-lg flex flex-col gap-1 hover:border-[#22C55E]/20 transition-colors">
                    <strong className="text-[#FAFAFA] block">Nearly sorted</strong>
                    <span className="text-[10px] text-[#8A8A8A] font-mono mb-1">Low Inversions</span>
                    <span className="text-[10px] text-[#22C55E] font-bold font-mono text-nowrap">Winner: Quick+Insertion</span>
                    <p className="text-[10px] text-[#8A8A8A] leading-relaxed mt-1">Insertion sort bases finish in O(n) linear time on sorted runs.</p>
                  </div>
                  <div className="border border-[#252525] bg-[#0D0D0D] p-3.5 rounded-lg flex flex-col gap-1 hover:border-[#22C55E]/20 transition-colors">
                    <strong className="text-[#FAFAFA] block">Reverse sorted</strong>
                    <span className="text-[10px] text-[#8A8A8A] font-mono mb-1">Max Inversions</span>
                    <span className="text-[10px] text-[#22C55E] font-bold font-mono">Winner: Introsort</span>
                    <p className="text-[10px] text-[#8A8A8A] leading-relaxed mt-1">Safe from quadratic time degradation via HeapSort recursion fallback.</p>
                  </div>
                  <div className="border border-[#252525] bg-[#0D0D0D] p-3.5 rounded-lg flex flex-col gap-1 hover:border-[#22C55E]/20 transition-colors">
                    <strong className="text-[#FAFAFA] block">Duplicate heavy</strong>
                    <span className="text-[10px] text-[#8A8A8A] font-mono mb-1">Key Collisions</span>
                    <span className="text-[10px] text-[#22C55E] font-bold font-mono">Winner: Quick+Merge</span>
                    <p className="text-[10px] text-[#8A8A8A] leading-relaxed mt-1">Stable merges avoid duplicate element swap loops.</p>
                  </div>
                </div>
              </div>

              {/* Final page actions */}
              <div className="flex justify-between items-center pt-4 border-t border-[#252525]">
                <button
                  onClick={handlePrevStep}
                  className="px-4 py-2 border border-[#252525] hover:border-[#8A8A8A] hover:text-[#FAFAFA] text-[#C9C9C9] transition-colors rounded text-xs cursor-pointer font-medium"
                >
                  Back to visualizer
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    setMaxUnlockedStep(1);
                  }}
                  className="bg-[#FAFAFA] hover:bg-transparent hover:text-[#FAFAFA] border border-[#FAFAFA] hover:border-[#22C55E] text-[#050505] font-semibold px-6 py-2.5 rounded transition-all duration-300 text-xs flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <span>Restart experiment</span>
                  <RotateCcw size={12} />
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

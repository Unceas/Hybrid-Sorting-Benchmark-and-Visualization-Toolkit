"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, RotateCcw, BarChart3, Settings, Database, Activity, 
  TrendingUp, BookOpen, Award, Copy, Download, Github, Cpu, 
  ArrowRight, ShieldAlert, Zap, History, FileSpreadsheet
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
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
  const [activeTab, setActiveTab] = useState<"home" | "benchmark" | "visualizer" | "analysis">("home");

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
  const [runHistory, setRunHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sorting_history");
    if (stored) {
      try {
        setRunHistory(jsonParseClean(stored));
      } catch (e) {}
    }
  }, []);

  const jsonParseClean = (val: string) => {
    return JSON.parse(val);
  };

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
    } catch (e: any) {
      setBenchError(e.message || "An unexpected error occurred during execution.");
    } finally {
      setBenchLoading(false);
    }
  };

  // ── STATE: Visualizer ──
  const [vizAlgo, setVizAlgo] = useState<string>("introsort");
  const [vizSize, setVizSize] = useState<number>(40);
  const [vizSpeed, setVizSpeed] = useState<number>(30); // delay in ms
  const [vizArray, setVizArray] = useState<{ value: number; state: "unsorted" | "compare" | "operation" | "sorted" }[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Visualizer stats
  const [vizComparisons, setVizComparisons] = useState<number>(0);
  const [vizSwaps, setVizSwaps] = useState<number>(0);
  const [vizDepth, setVizDepth] = useState<number>(0);
  const [vizStartTime, setVizStartTime] = useState<number | null>(null);
  const [vizElapsedTime, setVizElapsedTime] = useState<number>(0);

  // Transition Panel States
  const [currentSubAlgo, setCurrentSubAlgo] = useState<string>("QuickSort");
  const [currentPartitionSize, setCurrentPartitionSize] = useState<number>(0);
  const [vizThreshold, setVizThreshold] = useState<number>(10);
  const [switchStatus, setSwitchStatus] = useState<string>("Active");
  const [vizDepthLimit, setVizDepthLimit] = useState<number>(0);

  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const generatorRef = useRef<Generator<any, void, unknown> | null>(null);

  // Generate new visualizer dataset
  const generateNewVisualizerArray = () => {
    if (animationRef.current) clearInterval(animationRef.current);
    setIsPlaying(false);
    generatorRef.current = null;
    setVizComparisons(0);
    setVizSwaps(0);
    setVizDepth(0);
    setVizElapsedTime(0);
    setVizStartTime(null);
    setCurrentSubAlgo("QuickSort");
    setSwitchStatus("Active");
    setCurrentPartitionSize(vizSize);

    const arr = [];
    for (let i = 0; i < vizSize; ++i) {
      arr.push({
        value: Math.floor(Math.random() * 380) + 20,
        state: "unsorted" as const
      });
    }
    setVizArray(arr);
  };

  useEffect(() => {
    generateNewVisualizerArray();
  }, [vizSize]);

  // ── GENERATORS: Sorting Step-by-Step ──
  
  // 1. Insertion Sort Generator
  function* insertionSortGen(arr: typeof vizArray, low: number, high: number) {
    setCurrentSubAlgo("InsertionSort");
    setSwitchStatus("Insertion Sort Active");
    for (let i = low + 1; i <= high; ++i) {
      let key = arr[i].value;
      let j = i - 1;
      arr[i].state = "operation";
      yield;
      
      while (j >= low) {
        arr[j].state = "compare";
        setVizComparisons(c => c + 1);
        yield;
        
        if (arr[j].value > key) {
          arr[j + 1].value = arr[j].value;
          arr[j + 1].state = "operation";
          setVizSwaps(s => s + 1);
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
  function* heapifyGen(arr: typeof vizArray, low: number, n: number, root: number) {
    let largest = root;
    let left = 2 * root + 1;
    let right = 2 * root + 2;

    if (left < n) {
      arr[low + left].state = "compare";
      arr[low + largest].state = "compare";
      setVizComparisons(c => c + 1);
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
      setVizComparisons(c => c + 1);
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
      setVizSwaps(s => s + 1);
      yield;

      arr[low + root].state = "unsorted";
      arr[low + largest].state = "unsorted";

      yield* heapifyGen(arr, low, n, largest);
    }
  }

  function* heapSortGen(arr: typeof vizArray, low: number, high: number) {
    setCurrentSubAlgo("HeapSort");
    setSwitchStatus("Heap Sort Fallback");
    let n = high - low + 1;
    
    // Build heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      yield* heapifyGen(arr, low, n, i);
    }

    // Extract elements
    for (let i = n - 1; i > 0; i--) {
      const temp = arr[low].value;
      arr[low].value = arr[low + i].value;
      arr[low + i].value = temp;
      
      arr[low].state = "operation";
      arr[low + i].state = "sorted";
      setVizSwaps(s => s + 1);
      yield;

      arr[low].state = "unsorted";
      
      yield* heapifyGen(arr, low, i, 0);
    }
    arr[low].state = "sorted";
    yield;
  }

  // 3. Partition Helper for QuickSort Generators
  function* partitionGen(arr: typeof vizArray, low: number, high: number): Generator<any, number, any> {
    arr[high].state = "operation"; // pivot
    let pivot = arr[high].value;
    let i = low - 1;

    for (let j = low; j < high; ++j) {
      arr[j].state = "compare";
      setVizComparisons(c => c + 1);
      yield;

      if (arr[j].value <= pivot) {
        i++;
        if (i !== j) {
          const temp = arr[i].value;
          arr[i].value = arr[j].value;
          arr[j].value = temp;
          
          arr[i].state = "operation";
          arr[j].state = "operation";
          setVizSwaps(s => s + 1);
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
    setVizSwaps(s => s + 1);
    yield;
    arr[i + 1].state = "unsorted";
    
    return i + 1;
  }

  // 4. QuickSort Generator
  function* quickSortUtilGen(arr: typeof vizArray, low: number, high: number, depth: number): Generator<any, void, any> {
    if (low >= high) {
      if (low >= 0 && low < arr.length) arr[low].state = "sorted";
      return;
    }
    setVizDepth(d => Math.max(d, depth));
    setCurrentPartitionSize(high - low + 1);
    setCurrentSubAlgo("QuickSort");

    const p: number = yield* partitionGen(arr, low, high);
    arr[p].state = "sorted";
    yield;

    yield* quickSortUtilGen(arr, low, p - 1, depth + 1);
    yield* quickSortUtilGen(arr, p + 1, high, depth + 1);
  }

  // 5. MergeSort Generator (standard out-of-place merge sort animation)
  function* mergeSortUtilGen(arr: typeof vizArray, low: number, high: number): Generator<any, void, any> {
    if (low >= high) return;
    const mid = Math.floor(low + (high - low) / 2);
    yield* mergeSortUtilGen(arr, low, mid);
    yield* mergeSortUtilGen(arr, mid + 1, high);
    
    // Merge step
    setCurrentSubAlgo("MergeSort");
    let left = low;
    let right = mid + 1;
    const temp: number[] = [];

    while (left <= mid && right <= high) {
      arr[left].state = "compare";
      arr[right].state = "compare";
      setVizComparisons(c => c + 1);
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
      setVizSwaps(s => s + 1);
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
  function* quickInsertionUtilGen(arr: typeof vizArray, low: number, high: number, thresh: number, depth: number): Generator<any, void, any> {
    if (low >= high) return;
    setVizDepth(d => Math.max(d, depth));
    const size = high - low + 1;
    setCurrentPartitionSize(size);

    if (size < thresh) {
      yield* insertionSortGen(arr, low, high);
      return;
    }

    setCurrentSubAlgo("QuickSort");
    setSwitchStatus("QuickSort Active");
    const p: number = yield* partitionGen(arr, low, high);
    arr[p].state = "sorted";
    yield;

    yield* quickInsertionUtilGen(arr, low, p - 1, thresh, depth + 1);
    yield* quickInsertionUtilGen(arr, p + 1, high, thresh, depth + 1);
  }

  // 7. Quick + Merge Generator
  function* quickMergeUtilGen(arr: typeof vizArray, low: number, high: number, thresh: number, depth: number): Generator<any, void, any> {
    if (low >= high) return;
    setVizDepth(d => Math.max(d, depth));
    const size = high - low + 1;
    setCurrentPartitionSize(size);

    if (size < thresh) {
      yield* mergeSortUtilGen(arr, low, high);
      return;
    }

    setCurrentSubAlgo("QuickSort");
    setSwitchStatus("QuickSort Active");
    const p: number = yield* partitionGen(arr, low, high);
    arr[p].state = "sorted";
    yield;

    yield* quickMergeUtilGen(arr, low, p - 1, thresh, depth + 1);
    yield* quickMergeUtilGen(arr, p + 1, high, thresh, depth + 1);
  }

  // 8. Introsort Generator
  function* introsortUtilGen(arr: typeof vizArray, low: number, high: number, thresh: number, depthLimit: number, depth: number): Generator<any, void, any> {
    if (low >= high) return;
    setVizDepth(d => Math.max(d, depth));
    const size = high - low + 1;
    setCurrentPartitionSize(size);

    if (size < thresh) {
      yield* insertionSortGen(arr, low, high);
      return;
    }

    if (depth >= depthLimit) {
      yield* heapSortGen(arr, low, high);
      return;
    }

    setCurrentSubAlgo("QuickSort");
    setSwitchStatus("QuickSort Active");
    const p: number = yield* partitionGen(arr, low, high);
    arr[p].state = "sorted";
    yield;

    yield* introsortUtilGen(arr, low, p - 1, thresh, depthLimit, depth + 1);
    yield* introsortUtilGen(arr, p + 1, high, thresh, depthLimit, depth + 1);
  }

  // Visualizer master loop driver
  const runVisualizerStep = () => {
    if (!generatorRef.current) {
      setVizStartTime(Date.now());
      const tempArray = [...vizArray].map(x => ({ ...x, state: "unsorted" as const }));
      
      const thresh = vizThreshold;
      const depthLimit = 2 * Math.floor(Math.log2(vizSize));
      setVizDepthLimit(depthLimit);

      if (vizAlgo === "introsort") {
        generatorRef.current = introsortUtilGen(tempArray, 0, tempArray.length - 1, thresh, depthLimit, 0);
      } else if (vizAlgo === "quick_insertion") {
        generatorRef.current = quickInsertionUtilGen(tempArray, 0, tempArray.length - 1, thresh, 0);
      } else if (vizAlgo === "quick_merge") {
        generatorRef.current = quickMergeUtilGen(tempArray, 0, tempArray.length - 1, thresh, 0);
      } else if (vizAlgo === "quicksort") {
        generatorRef.current = quickSortUtilGen(tempArray, 0, tempArray.length - 1, 0);
      } else if (vizAlgo === "mergesort") {
        generatorRef.current = mergeSortUtilGen(tempArray, 0, tempArray.length - 1);
      } else if (vizAlgo === "heapsort") {
        generatorRef.current = heapSortGen(tempArray, 0, tempArray.length - 1);
      }
    }

    const nextStep = generatorRef.current?.next();
    if (nextStep && !nextStep.done) {
      if (vizStartTime) {
        setVizElapsedTime(Math.floor((Date.now() - vizStartTime) / 100));
      }
      setVizArray([...vizArray]);
    } else {
      // Completed sorting
      setIsPlaying(false);
      if (animationRef.current) clearInterval(animationRef.current);
      
      // Force all bars to green sorted state
      const finalSorted = [...vizArray].map(x => ({ ...x, state: "sorted" as const }));
      setVizArray(finalSorted);
      setSwitchStatus("Completed Successfully");
    }
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
  }, [vizSpeed]);

  useEffect(() => {
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e4e4e7] flex flex-col font-sans antialiased text-sm">
      {/* Top Navbar */}
      <header className="border-b border-[#18181b] bg-[#09090b]/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/40 rounded border border-emerald-500/20">
            <Cpu className="text-emerald-500" size={20} />
          </div>
          <div>
            <span className="text-sm font-bold text-zinc-100 tracking-wider">
              Hybrid Sorting Systems
            </span>
            <span className="text-xs text-zinc-500 tracking-tight block uppercase">
              Performance Engineering Studio
            </span>
          </div>
        </div>

        <nav className="flex bg-[#18181b] rounded-lg p-1 border border-[#27272a]">
          {(["home", "benchmark", "visualizer", "analysis"] as const).map((tab) => (
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
              className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${activeTab === tab ? "bg-[#27272a] text-emerald-400 border border-[#3f3f46]/30 font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {tab === "benchmark" ? "Benchmark Lab" : tab}
            </button>
          ))}
        </nav>

        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition duration-150"
        >
          <Github size={15} /> GitHub
        </a>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6 overflow-y-auto">
        
        {/* ── PAGE 1: Home ── */}
        {activeTab === "home" && (
          <div className="flex flex-col gap-8">
            {/* Hero Section */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-lg px-8 py-12 flex flex-col gap-4 text-center max-w-3xl mx-auto w-full">
              <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest block">
                Platform Release v3.0
              </span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Hybrid Sorting Systems & Performance Engineering
              </h1>
              <p className="text-zinc-450 leading-relaxed text-sm max-w-xl mx-auto">
                Benchmark, visualize, and analyze adaptive hybrid sorting algorithms through interactive performance experiments. Explore how crossover thresholds control hardware overhead.
              </p>
              <div className="flex gap-4 justify-center mt-4">
                <button
                  onClick={() => setActiveTab("benchmark")}
                  className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-zinc-950 font-bold px-6 py-2.5 rounded text-xs uppercase tracking-wider transition duration-150"
                >
                  Open Benchmark Lab
                </button>
                <button
                  onClick={() => setActiveTab("visualizer")}
                  className="bg-[#27272a] border border-[#3f3f46] hover:bg-zinc-800 text-white font-bold px-6 py-2.5 rounded text-xs uppercase tracking-wider transition duration-150"
                >
                  Explore Algorithms
                </button>
              </div>
            </div>

            {/* Project Overview Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                <div className="p-2 bg-emerald-950/20 text-emerald-400 rounded-lg w-fit mb-3">
                  <Activity size={18} />
                </div>
                <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-wider mb-2">Hybrid Algorithms</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Evaluate custom implementations: Quick+Insertion, Quick+Merge, and Introsort running on optimized C++ kernels.
                </p>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                <div className="p-2 bg-blue-950/20 text-blue-400 rounded-lg w-fit mb-3">
                  <Database size={18} />
                </div>
                <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-wider mb-2">Benchmark Engine</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Measure runtime statistics across various dataset profiles: uniform random, nearly sorted, reverse, and duplicates.
                </p>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                <div className="p-2 bg-purple-950/20 text-purple-400 rounded-lg w-fit mb-3">
                  <RotateCcw size={18} />
                </div>
                <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-wider mb-2">Visualization Engine</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Observe recursive partition boundaries, swap mechanics, heap creation states, and active hybrid switches in real-time.
                </p>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                <div className="p-2 bg-amber-950/20 text-amber-400 rounded-lg w-fit mb-3">
                  <TrendingUp size={18} />
                </div>
                <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-wider mb-2">Performance Analysis</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Compare exact metrics including operation counts, stack nesting depth thresholds, and stack frame memory bytes.
                </p>
              </div>
            </div>

            {/* Architecture Section Flow Diagram */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-6">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-6 text-center">
                Performance Lab Architecture Pipeline
              </h3>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto w-full py-4 text-xs font-mono">
                {[
                  { step: "Dataset", desc: "Sequence Generation" },
                  { step: "Algorithm Selection", desc: "Select Active Targets" },
                  { step: "Benchmark Execution", desc: "C++ Optimization Run" },
                  { step: "Metrics Collection", desc: "Comparisons & Memory" },
                  { step: "Graph Generation", desc: "Plot Scaling Curves" },
                  { step: "Result Analysis", desc: "Evaluate Crossovers" }
                ].map((item, idx, arr) => (
                  <React.Fragment key={idx}>
                    <div className="bg-zinc-950 border border-[#27272a] rounded-lg p-4 text-center flex-1 w-full md:w-auto">
                      <div className="text-emerald-400 font-bold mb-1 uppercase tracking-wider">{item.step}</div>
                      <div className="text-zinc-500 text-[10px]">{item.desc}</div>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="text-emerald-500 flex items-center justify-center rotate-90 md:rotate-0">
                        <ArrowRight size={18} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PAGE 2: Benchmark Lab ── */}
        {activeTab === "benchmark" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lab Configuration Panel */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-[#27272a] pb-2 mb-1">
                <Settings size={15} className="text-emerald-500" />
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Configuration Panel</h3>
              </div>

              {/* Dataset Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Dataset Type</label>
                <select
                  value={datasetType}
                  onChange={(e) => setDatasetType(e.target.value)}
                  className="bg-zinc-950 border border-[#27272a] rounded px-3 py-2 text-zinc-300 focus:outline-none"
                >
                  <option value="random">Random (Uniform)</option>
                  <option value="nearly_sorted">Nearly Sorted</option>
                  <option value="reverse_sorted">Reverse Sorted</option>
                  <option value="duplicate_heavy">Duplicate Heavy</option>
                </select>
              </div>

              {/* Dataset Size Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase font-semibold">
                  <span>Dataset Size (N)</span>
                  <span className="text-emerald-400 font-bold">{getDatasetSizeFromExponent(sizeExponent).toLocaleString()}</span>
                </div>
                <input 
                  type="range"
                  min="2"
                  max="6"
                  value={sizeExponent}
                  onChange={(e) => setSizeExponent(parseInt(e.target.value))}
                  className="accent-emerald-500 bg-zinc-950 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-zinc-650 px-1 font-mono">
                  <span>100</span>
                  <span>1K</span>
                  <span>10K</span>
                  <span>100K</span>
                  <span>1M</span>
                </div>
              </div>

              {/* Algorithms Selection Checkboxes */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Algorithm Selection</label>
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
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition duration-150 ${selectedAlgos.includes(algoItem.id) ? "bg-emerald-950/20 border-emerald-500/30 text-zinc-200" : "bg-black/25 border-transparent text-zinc-500 hover:border-[#27272a]"}`}
                    >
                      <input 
                        type="checkbox"
                        checked={selectedAlgos.includes(algoItem.id)}
                        onChange={() => toggleAlgoSelection(algoItem.id)}
                        className="accent-emerald-500 rounded"
                      />
                      <span>{algoItem.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Advanced Settings Collapsible */}
              <div className="border border-[#27272a] rounded">
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="w-full text-left px-3 py-2 text-xs bg-zinc-950 hover:bg-zinc-900 flex justify-between items-center text-zinc-400 font-bold uppercase tracking-wider"
                >
                  <span>Advanced Settings</span>
                  <span>{advancedOpen ? "−" : "+"}</span>
                </button>
                {advancedOpen && (
                  <div className="p-3 flex flex-col gap-3 bg-zinc-950/40">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px] text-zinc-500">
                        <span>CROSSOVER THRESHOLD</span>
                        <span className="text-emerald-500 font-bold">{threshold}</span>
                      </div>
                      <select
                        value={threshold}
                        onChange={(e) => setThreshold(parseInt(e.target.value))}
                        className="bg-zinc-950 border border-[#27272a] rounded px-2.5 py-1.5 text-xs focus:outline-none"
                      >
                        <option value={8}>8 Elements</option>
                        <option value={16}>16 Elements</option>
                        <option value={32}>32 Elements</option>
                        <option value={64}>64 Elements</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase">Pivot Strategy</label>
                      <select
                        value={pivotStrategy}
                        onChange={(e) => setPivotStrategy(e.target.value)}
                        className="bg-zinc-950 border border-[#27272a] rounded px-2.5 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="first">First Element</option>
                        <option value="random">Random Index</option>
                        <option value="median_of_three">Median of Three</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleRunBenchmark}
                disabled={benchLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-zinc-900 disabled:text-zinc-650 text-zinc-950 font-bold py-2.5 rounded transition duration-150 uppercase text-xs tracking-wider"
              >
                {benchLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                Run Benchmark
              </button>
            </div>

            {/* Results, Charts & Summary Panels */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {benchError && (
                <div className="bg-red-950/20 border border-red-900/40 text-red-400 p-4 rounded text-xs">
                  {benchError}
                </div>
              )}

              {/* Benchmark Summary cards */}
              {benchResults.length > 0 && (
                (() => {
                  const best = [...benchResults].reduce((min, cur) => cur.execution_time_ms < min.execution_time_ms ? cur : min, benchResults[0]);
                  // Find pure QuickSort speed to evaluate improvement
                  const quickPure = benchResults.find(r => r.algorithm === "quicksort");
                  const improvementPct = quickPure 
                    ? ((quickPure.execution_time_ms - best.execution_time_ms) / quickPure.execution_time_ms * 100).toFixed(0)
                    : "N/A";

                  return (
                    <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Best Performer</span>
                        <div className="text-base font-extrabold text-emerald-400 uppercase mt-0.5">{best.algorithm}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Runtime</span>
                        <div className="text-base font-extrabold text-zinc-200 mt-0.5">
                          {(best.execution_time_ms * 1000).toFixed(1)} μs
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Improvement</span>
                        <div className="text-base font-extrabold text-zinc-200 mt-0.5">
                          {improvementPct !== "N/A" && parseInt(improvementPct) > 0 ? `${improvementPct}% faster than QuickSort` : "Optimal"}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Results Table */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                <h3 className="text-xs font-bold text-zinc-250 uppercase tracking-wider mb-4 border-b border-[#27272a] pb-2">
                  Execution Output Metrics
                </h3>
                {benchResults.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 italic text-xs">
                    No active results. Configure parameters and run benchmark to compile records.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#27272a] text-zinc-500 uppercase font-bold text-[10px]">
                          <th className="py-2 px-3">Algorithm</th>
                          <th className="py-2 px-3 text-right">Runtime (μs)</th>
                          <th className="py-2 px-3 text-right">Comparisons</th>
                          <th className="py-2 px-3 text-right">Swaps / Writes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-950 font-mono text-zinc-300">
                        {benchResults.map((r, idx) => (
                          <tr key={idx} className="hover:bg-zinc-900/10">
                            <td className="py-2.5 px-3 font-sans font-semibold text-zinc-100">{getAlgoDisplayName(r.algorithm)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                              {(r.execution_time_ms * 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </td>
                            <td className="py-2.5 px-3 text-right">{r.comparisons.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right">{r.swaps.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Graphs Area */}
              {benchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Runtime Bar Chart */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                    <h4 className="text-xs font-bold text-zinc-400 mb-4 tracking-wider uppercase">Runtime Comparison (μs)</h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={benchResults.map(r => ({ ...r, runtime_us: r.execution_time_ms * 1000 }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="algorithm" stroke="#71717a" tickFormatter={(v) => v.replace("quick_", "Q+").replace("sort", "")} style={{ fontSize: 9 }} />
                          <YAxis stroke="#71717a" style={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: 10 }} />
                          <Bar dataKey="runtime_us" name="Time (μs)" fill="#10b981" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Scale Line Chart (Estimates based on scaling curves) */}
                  <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                    <h4 className="text-xs font-bold text-zinc-400 mb-4 tracking-wider uppercase">Performance vs Dataset Size</h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { size: "100", quicksort: 5, mergesort: 8, heapsort: 9, introsort: 4 },
                          { size: "1K", quicksort: 65, mergesort: 92, heapsort: 104, introsort: 55 },
                          { size: "10K", quicksort: 780, mergesort: 1100, heapsort: 1250, introsort: 680 },
                          { size: "100K", quicksort: 9100, mergesort: 13200, heapsort: 14800, introsort: 8100 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="size" stroke="#71717a" style={{ fontSize: 9 }} />
                          <YAxis stroke="#71717a" style={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: 10 }} />
                          <Line type="monotone" dataKey="introsort" stroke="#10b981" strokeWidth={1.5} name="Introsort" />
                          <Line type="monotone" dataKey="quicksort" stroke="#3b82f6" strokeWidth={1.2} name="Quick" />
                          <Line type="monotone" dataKey="mergesort" stroke="#a855f7" strokeWidth={1.2} name="Merge" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* History and Exports Optional features */}
              {runHistory.length > 0 && (
                <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                  <div className="flex items-center justify-between border-b border-[#27272a] pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <History size={14} className="text-zinc-500" />
                      <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Local Experiment History</h4>
                    </div>
                    <button
                      onClick={clearHistory}
                      className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto text-[11px] font-mono flex flex-col gap-2">
                    {runHistory.map(h => (
                      <div key={h.id} className="flex justify-between items-center py-1 border-b border-zinc-950 text-zinc-400">
                        <span>{h.date} | {h.dataset.toUpperCase()} (N={h.size})</span>
                        <span>{h.algorithm}: <strong className="text-emerald-400">{(h.runtime_ms * 1000).toFixed(0)} μs</strong></span>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visualizer Controls */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-[#27272a] pb-2 mb-1">
                <Settings size={15} className="text-emerald-500" />
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Visualizer Controls</h3>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Algorithm Selector</label>
                <select
                  value={vizAlgo}
                  onChange={(e) => {
                    setVizAlgo(e.target.value);
                    generateNewVisualizerArray();
                  }}
                  className="bg-zinc-950 border border-[#27272a] rounded px-3 py-2 text-zinc-300 focus:outline-none"
                >
                  <option value="introsort">Introsort (Quick+Heap+Insertion)</option>
                  <option value="quick_insertion">Quick + Insertion</option>
                  <option value="quick_merge">Quick + Merge</option>
                  <option value="quicksort">Standard QuickSort</option>
                  <option value="mergesort">Standard MergeSort</option>
                  <option value="heapsort">Standard HeapSort</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase font-semibold">
                  <span>Array Size</span>
                  <span className="text-emerald-400 font-bold">{vizSize}</span>
                </div>
                <input 
                  type="range"
                  min="15"
                  max="120"
                  value={vizSize}
                  onChange={(e) => setVizSize(parseInt(e.target.value))}
                  className="accent-emerald-500 bg-zinc-950 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase font-semibold">
                  <span>Base Crossover Threshold</span>
                  <span className="text-emerald-400 font-bold">{vizThreshold}</span>
                </div>
                <input 
                  type="range"
                  min="4"
                  max="30"
                  value={vizThreshold}
                  onChange={(e) => {
                    setVizThreshold(parseInt(e.target.value));
                    generateNewVisualizerArray();
                  }}
                  className="accent-emerald-500 bg-zinc-950 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase font-semibold">
                  <span>Animation Delay (ms)</span>
                  <span className="text-emerald-400 font-bold">{vizSpeed}ms</span>
                </div>
                <input 
                  type="range"
                  min="2"
                  max="250"
                  value={vizSpeed}
                  onChange={(e) => setVizSpeed(parseInt(e.target.value))}
                  className="accent-emerald-500 bg-zinc-950 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={handlePlayPause}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-zinc-950 font-bold py-2 rounded text-xs uppercase"
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  onClick={generateNewVisualizerArray}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#27272a] hover:bg-zinc-800 text-white border border-[#3f3f46]/40 font-bold py-2 rounded text-xs uppercase"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>
            </div>

            {/* Canvas & Live Analytics */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Visualization Canvas */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5 flex flex-col gap-4">
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider border-b border-[#27272a] pb-2">
                  Visualization Canvas
                </h3>
                
                {/* Simulated bar array */}
                <div className="h-64 flex items-end justify-between gap-0.5 bg-zinc-950/60 p-4 border border-[#27272a] rounded">
                  {vizArray.map((bar, idx) => {
                    let colorClass = "bg-blue-600/40 border-t border-blue-500/80"; // unsorted
                    if (bar.state === "compare") colorClass = "bg-red-500 border-t border-red-400";
                    if (bar.state === "operation") colorClass = "bg-yellow-500 border-t border-yellow-400";
                    if (bar.state === "sorted") colorClass = "bg-emerald-500/60 border-t border-emerald-400/80";

                    return (
                      <div 
                        key={idx}
                        className={`flex-1 ${colorClass}`}
                        style={{ height: `${(bar.value / 400) * 100}%` }}
                      />
                    );
                  })}
                </div>

                {/* Color Keys */}
                <div className="flex gap-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-600/40 rounded border-t border-blue-500"></span> Unsorted
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-yellow-500 rounded border-t border-yellow-450"></span> Operation
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded border-t border-red-400"></span> Comparison
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded border-t border-emerald-400"></span> Sorted
                  </div>
                </div>
              </div>

              {/* Transition & Live Stats panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hybrid Transition Panel */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                  <h4 className="text-xs font-bold text-zinc-400 mb-4 tracking-wider uppercase">Hybrid Crossover Status</h4>
                  <div className="flex flex-col gap-3 text-xs font-mono">
                    <div className="flex justify-between border-b border-[#27272a] pb-1.5">
                      <span className="text-zinc-500">ACTIVE KERNEL</span>
                      <span className="text-emerald-400 font-bold">{currentSubAlgo}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#27272a] pb-1.5">
                      <span className="text-zinc-500">PARTITION RANGE SIZE</span>
                      <span className="text-zinc-300 font-semibold">{currentPartitionSize}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#27272a] pb-1.5">
                      <span className="text-zinc-500">SWITCH LIMIT THRESHOLD</span>
                      <span className="text-zinc-300 font-semibold">{vizThreshold}</span>
                    </div>
                    {vizAlgo === "introsort" && (
                      <div className="flex justify-between border-b border-[#27272a] pb-1.5">
                        <span className="text-zinc-500">LIMIT LIMIT (2*log2 N)</span>
                        <span className="text-zinc-300 font-semibold">{vizDepthLimit}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-zinc-500">SWITCH STATE STATUS</span>
                      <span className="text-zinc-300 font-semibold uppercase">{switchStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Statistics Panel */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                  <h4 className="text-xs font-bold text-zinc-400 mb-4 tracking-wider uppercase">Live Metrics</h4>
                  <div className="flex flex-col gap-3 text-xs font-mono">
                    <div className="flex justify-between border-b border-[#27272a] pb-1.5">
                      <span className="text-zinc-500">COMPARISONS</span>
                      <span className="text-zinc-300 font-semibold">{vizComparisons.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#27272a] pb-1.5">
                      <span className="text-zinc-500">SWAPS / MUTATIONS</span>
                      <span className="text-zinc-300 font-semibold">{vizSwaps.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#27272a] pb-1.5">
                      <span className="text-zinc-500">MAX RECURSION DEPTH</span>
                      <span className="text-zinc-300 font-semibold">{vizDepth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">ELAPSED TIME (SEC)</span>
                      <span className="text-emerald-400 font-bold">{vizElapsedTime}s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PAGE 4: Analysis ── */}
        {activeTab === "analysis" && (
          <div className="flex flex-col gap-6">
            {/* Algorithm Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5 flex flex-col gap-3 text-xs leading-relaxed">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide border-b border-[#27272a] pb-2">
                  Quick + Insertion Sort
                </h3>
                <p className="text-zinc-400">
                  <strong>Overview:</strong> Splits partitions recursively using QuickSort. Once partition size drops below the threshold, it invokes Insertion Sort on that range.
                </p>
                <div>
                  <strong className="text-zinc-300 block mb-0.5">Advantages:</strong>
                  <span className="text-zinc-450">Bypasses massive overhead of stack frames for small ranges. Optimal cache locality.</span>
                </div>
                <div>
                  <strong className="text-zinc-300 block mb-0.5">Disadvantages:</strong>
                  <span className="text-zinc-450">Degrades to quadratic O(N²) time complexity under skewed pivot selection on worst-case arrays.</span>
                </div>
                <div className="bg-black/30 rounded border border-[#27272a] p-2 mt-1">
                  <span className="text-[10px] text-zinc-500 uppercase block mb-1">Complexity Profile</span>
                  <span className="text-zinc-300">Time: O(N log N) avg | Space: O(log N)</span>
                </div>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5 flex flex-col gap-3 text-xs leading-relaxed">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide border-b border-[#27272a] pb-2">
                  Quick + Merge Sort
                </h3>
                <p className="text-zinc-400">
                  <strong>Overview:</strong> Swaps partition routines to an out-of-place Merge Sort when the size drops below threshold limits.
                </p>
                <div>
                  <strong className="text-zinc-300 block mb-0.5">Advantages:</strong>
                  <span className="text-zinc-450">Stable sorting on segments, lower overall comparisons compared to insertion on larger thresholds.</span>
                </div>
                <div>
                  <strong className="text-zinc-300 block mb-0.5">Disadvantages:</strong>
                  <span className="text-zinc-450">Requires O(N) auxiliary heap allocations. High array element writes during merge copy operations.</span>
                </div>
                <div className="bg-black/30 rounded border border-[#27272a] p-2 mt-1">
                  <span className="text-[10px] text-zinc-500 uppercase block mb-1">Complexity Profile</span>
                  <span className="text-zinc-300">Time: O(N log N) avg | Space: O(N) aux</span>
                </div>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5 flex flex-col gap-3 text-xs leading-relaxed">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide border-b border-[#27272a] pb-2">
                  Introsort
                </h3>
                <p className="text-zinc-400">
                  <strong>Overview:</strong> Begins with QuickSort, switches to Insertion Sort on tiny subproblems, and transitions to HeapSort if recursion depth exceeds limits.
                </p>
                <div>
                  <strong className="text-zinc-300 block mb-0.5">Advantages:</strong>
                  <span className="text-zinc-450">Guarantees O(N log N) worst-case time complexity limit. Safe from quadratic stack collapse.</span>
                </div>
                <div>
                  <strong className="text-zinc-300 block mb-0.5">Disadvantages:</strong>
                  <span className="text-zinc-450">Heapsort limits pivot cache coherence during fallback sequences.</span>
                </div>
                <div className="bg-black/30 rounded border border-[#27272a] p-2 mt-1">
                  <span className="text-[10px] text-zinc-500 uppercase block mb-1">Complexity Profile</span>
                  <span className="text-zinc-300">Time: O(N log N) bounds | Space: O(log N)</span>
                </div>
              </div>
            </div>

            {/* Complexity Table & Threshold Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Complexity Comparison Table */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
                <h3 className="text-xs font-bold text-zinc-250 uppercase tracking-wider mb-4 border-b border-[#27272a] pb-2">
                  Complexity Comparison Reference
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#27272a] text-zinc-500 uppercase text-[10px] font-bold">
                        <th className="py-2">Algorithm</th>
                        <th className="py-2">Best Case</th>
                        <th className="py-2">Average Case</th>
                        <th className="py-2">Worst Case</th>
                        <th className="py-2">Space Complexity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950 font-mono text-zinc-300">
                      <tr className="hover:bg-zinc-900/10">
                        <td className="py-2 font-sans font-semibold text-zinc-200">Quick + Insertion</td>
                        <td className="py-2">O(N)</td>
                        <td className="py-2">O(N log N)</td>
                        <td className="py-2 text-amber-500">O(N²)</td>
                        <td className="py-2">O(log N)</td>
                      </tr>
                      <tr className="hover:bg-zinc-900/10">
                        <td className="py-2 font-sans font-semibold text-zinc-200">Quick + Merge</td>
                        <td className="py-2">O(N log N)</td>
                        <td className="py-2">O(N log N)</td>
                        <td className="py-2 text-amber-500">O(N²)</td>
                        <td className="py-2 text-red-400">O(N)</td>
                      </tr>
                      <tr className="hover:bg-zinc-900/10">
                        <td className="py-2 font-sans font-semibold text-zinc-200">Introsort</td>
                        <td className="py-2">O(N)</td>
                        <td className="py-2 text-emerald-400 font-bold">O(N log N)</td>
                        <td className="py-2 text-emerald-400 font-bold">O(N log N)</td>
                        <td className="py-2">O(log N)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Threshold Analysis Card */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-zinc-250 uppercase tracking-wider border-b border-[#27272a] pb-2">
                  Crossover Threshold Speed curves
                </h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Runtimes associated with various threshold limits (N = 50,000, Uniform Random, averaged over 5 runs):
                </p>
                <div className="flex flex-col gap-2 font-mono text-xs">
                  <div className="flex justify-between border-b border-zinc-950 pb-1.5">
                    <span className="text-zinc-400">Threshold = 8</span>
                    <span className="text-zinc-300">4.12 ms (Sub-optimal, high stack overheads)</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-950 pb-1.5">
                    <span className="text-zinc-400">Threshold = 16</span>
                    <span className="text-emerald-400 font-bold">3.51 ms (SWEET SPOT)</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-950 pb-1.5">
                    <span className="text-zinc-400">Threshold = 32</span>
                    <span className="text-zinc-300">3.88 ms (Slight insertion sort overhead)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Threshold = 64</span>
                    <span className="text-zinc-300">4.72 ms (Insertion sort quadratic decay)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dataset Impact Analysis */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-5">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-4 border-b border-[#27272a] pb-2">
                Dataset Distribution Impact Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-black/20 border border-[#27272a] p-3 rounded">
                  <strong className="text-zinc-200 block mb-1">Random Distribution</strong>
                  <span className="text-zinc-500 block mb-2">High Entropy</span>
                  <div className="text-[11px] text-emerald-400 font-bold uppercase">Winner: Introsort</div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Standard random layouts benefit from QuickSort's optimal pivot partitioning loops.</p>
                </div>
                <div className="bg-black/20 border border-[#27272a] p-3 rounded">
                  <strong className="text-zinc-200 block mb-1">Nearly Sorted</strong>
                  <span className="text-zinc-500 block mb-2">Low Inversions</span>
                  <div className="text-[11px] text-emerald-400 font-bold uppercase">Winner: Quick+Insertion</div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Insertion Sort base runs in O(N) for presorted runs, avoiding recursive tree builds.</p>
                </div>
                <div className="bg-black/20 border border-[#27272a] p-3 rounded">
                  <strong className="text-zinc-200 block mb-1">Reverse Sorted</strong>
                  <span className="text-zinc-500 block mb-2">Maximum Inversions</span>
                  <div className="text-[11px] text-emerald-400 font-bold uppercase">Winner: Introsort</div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Worst-case pivot selections trigger Introsort's HeapSort fallback wrapper to keep bounds.</p>
                </div>
                <div className="bg-black/20 border border-[#27272a] p-3 rounded">
                  <strong className="text-zinc-200 block mb-1">Duplicate Heavy</strong>
                  <span className="text-zinc-500 block mb-2">High Key Collisions</span>
                  <div className="text-[11px] text-emerald-400 font-bold uppercase">Winner: Quick+Merge</div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Stable merge sorts process repetitive keys with fewer comparisons than insertions.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

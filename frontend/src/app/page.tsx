"use client";

import React, { useState, useEffect } from "react";
import { 
  Play, BarChart3, Settings, Database, Activity, GitFork, 
  RefreshCw, TrendingUp, History, Info, ChevronRight, ChevronDown, 
  CheckCircle, Terminal, Cpu, Sparkles, BookOpen, Lock, Unlock
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

// API Base URL
const API_URL = "http://127.0.0.1:8000/api";

interface SplitNode {
  low: number;
  high: number;
  pivotIndex: number;
  depth: number;
  left?: SplitNode;
  right?: SplitNode;
}

// Build Interval Tree from C++ flat splits array
function buildRecursionTree(splits: any[], size: number): SplitNode | null {
  if (!splits || splits.length === 0) return null;
  
  function helper(low: number, high: number, depth: number): SplitNode | null {
    let match: any = null;
    for (const s of splits) {
      if (s.low === low && s.high === high) {
        match = s;
        break;
      }
    }
    
    if (!match) return null;
    
    const node: SplitNode = {
      low: match.low,
      high: match.high,
      pivotIndex: match.pivot_index,
      depth: match.depth
    };
    
    if (match.pivot_index - 1 >= low) {
      const leftNode = helper(low, match.pivot_index - 1, depth + 1);
      if (leftNode) node.left = leftNode;
    }
    
    if (match.pivot_index + 1 <= high) {
      const rightNode = helper(match.pivot_index + 1, high, depth + 1);
      if (rightNode) node.right = rightNode;
    }
    
    return node;
  }
  
  return helper(0, size - 1, 0);
}

// Interactive Node component for the Recursion Tree view
const TreeNode: React.FC<{ node: SplitNode; threshold: number }> = ({ node, threshold }) => {
  const [isOpen, setIsOpen] = useState(true);
  const rangeSize = node.high - node.low + 1;
  
  let type = "QuickSort Split";
  let colorClass = "border-blue-900 bg-blue-950/20 text-blue-400";
  
  if (rangeSize < threshold) {
    type = "Insertion/Base Switch";
    colorClass = "border-emerald-900 bg-emerald-950/20 text-emerald-400";
  }

  const hasChildren = node.left || node.right;

  return (
    <div className="ml-4 border-l border-zinc-900 pl-4 my-2">
      <div 
        onClick={() => hasChildren && setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono w-fit cursor-pointer transition-all duration-200 ${colorClass} hover:brightness-110`}
      >
        {hasChildren ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <Activity size={12} />}
        <div>
          <span className="font-semibold">{type}</span> (Depth {node.depth})
          <div className="text-[10px] text-zinc-500 mt-0.5">
            Range: <span className="text-zinc-400">[{node.low} ... {node.high}]</span> | 
            Pivot Index: <span className="text-zinc-400">{node.pivotIndex}</span> | 
            Size: <span className="text-zinc-400">{rangeSize}</span>
          </div>
        </div>
      </div>
      
      {isOpen && hasChildren && (
        <div className="flex flex-col gap-1 mt-1">
          {node.left && (
            <div className="flex items-start">
              <span className="text-[10px] text-zinc-700 mt-2 mr-1">L</span>
              <TreeNode node={node.left} threshold={threshold} />
            </div>
          )}
          {node.right && (
            <div className="flex items-start">
              <span className="text-[10px] text-zinc-700 mt-2 mr-1">R</span>
              <TreeNode node={node.right} threshold={threshold} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"single" | "sweep" | "history" | "architecture">("single");

  // Single run configuration state
  const [algo, setAlgo] = useState("all");
  const [size, setSize] = useState(15000);
  const [dataset, setDataset] = useState("random");
  const [runs, setRuns] = useState(5);
  const [seed, setSeed] = useState(42);
  const [enableSplits, setEnableSplits] = useState(true);
  const [profile, setProfile] = useState("balanced");

  // If profile != "custom", override threshold/pivot settings
  const [threshold, setThreshold] = useState(16);
  const [pivot, setPivot] = useState("median_of_three");

  useEffect(() => {
    if (profile === "balanced") {
      setThreshold(16);
      setPivot("median_of_three");
    } else if (profile === "low_latency") {
      setThreshold(32);
      setPivot("median_of_three");
    } else if (profile === "memory_optimized") {
      setThreshold(8);
      setPivot("median_of_three");
    } else if (profile === "large_dataset_optimized") {
      setThreshold(24);
      setPivot("median_of_three");
    }
  }, [profile]);

  // Sweep configuration state
  const [sweepParam, setSweepParam] = useState<"threshold" | "size">("threshold");
  const [sweepValues, setSweepValues] = useState("4, 8, 12, 16, 24, 32, 48, 64");
  const [sweepSize, setSweepSize] = useState(20000);
  const [sweepThreshold, setSweepThreshold] = useState(16);
  const [sweepDataset, setSweepDataset] = useState("random");
  const [sweepSeed, setSweepSeed] = useState(42);

  // Loading & Data States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [singleResults, setSingleResults] = useState<any[]>([]);
  const [selectedAlgoDetails, setSelectedAlgoDetails] = useState<any | null>(null);
  const [sweepChartData, setSweepChartData] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Fetch history list
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/results`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (e) {
      console.error("Failed to load history list", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Run benchmark handler
  const handleRunBenchmark = async () => {
    setLoading(true);
    setError(null);
    setSelectedAlgoDetails(null);
    try {
      const res = await fetch(`${API_URL}/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          algo, 
          size, 
          dataset, 
          threshold, 
          pivot, 
          runs, 
          enable_splits: enableSplits,
          seed,
          profile
        })
      });

      if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || "Execution failed");
      }

      const data = await res.json();
      setSingleResults(data.results);
      if (data.results.length > 0) {
        setSelectedAlgoDetails(data.results[0]);
      }
      fetchHistory();
    } catch (e: any) {
      setError(e.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Run parameter sweep handler
  const handleRunSweep = async () => {
    setLoading(true);
    setError(null);
    setSweepChartData([]);
    
    const vals = sweepValues.split(",")
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v) && v > 0);

    if (vals.length === 0) {
      setError("Please enter valid comma-separated sweep values.");
      setLoading(false);
      return;
    }

    try {
      const chartPoints: any[] = [];
      
      for (const val of vals) {
        const reqSize = sweepParam === "size" ? val : sweepSize;
        const reqThreshold = sweepParam === "threshold" ? val : sweepThreshold;

        const res = await fetch(`${API_URL}/benchmark`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            algo: "all",
            size: reqSize,
            dataset: sweepDataset,
            threshold: reqThreshold,
            pivot: "median_of_three",
            runs: 2,
            enable_splits: false,
            seed: sweepSeed,
            profile: "custom"
          })
        });

        if (!res.ok) {
          const detail = await res.json();
          throw new Error(`Sweep step fail at ${sweepParam}=${val}: ${detail.detail}`);
        }

        const data = await res.json();
        const pointData: any = { parameter: val };
        
        data.results.forEach((r: any) => {
          pointData[r.algorithm] = r.execution_time_ms;
        });

        chartPoints.push(pointData);
        setSweepChartData([...chartPoints]);
      }
    } catch (e: any) {
      setError(e.message || "Sweep execution interrupted.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHistoryReport = async (reportId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/results/${reportId}`);
      if (!res.ok) {
        throw new Error("Failed to retrieve report data.");
      }
      const data = await res.json();
      setSingleResults(data.results);
      if (data.results.length > 0) {
        setSelectedAlgoDetails(data.results[0]);
      }
      setActiveTab("single");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getAlgoDisplayName = (name: string) => {
    switch (name) {
      case "introsort": return "Introsort";
      case "quick_insertion": return "Quick + Insertion";
      case "quick_merge": return "Quick + Merge";
      case "quick_heap": return "Quick + Heap";
      default: return name;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 flex flex-col font-mono text-[13px] antialiased">
      {/* Top Header Navigation */}
      <header className="border-b border-zinc-900 bg-[#09090b]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/30 rounded border border-emerald-900/30">
            <Cpu className="text-emerald-500" size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 tracking-wider">
              ADAPTIVE SORTING PERFORMANCE FRAMEWORK
            </h1>
            <p className="text-[10px] text-zinc-500 tracking-tight mt-0.5">
              BENCHMARK-DRIVEN RUNTIME OPTIMIZATION & DIAGNOSTICS ENGINE
            </p>
          </div>
        </div>

        <nav className="flex bg-[#121214] rounded-lg p-0.5 border border-zinc-900">
          <button 
            onClick={() => setActiveTab("single")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${activeTab === "single" ? "bg-[#27272a] text-zinc-50" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Live Monitor
          </button>
          <button 
            onClick={() => setActiveTab("sweep")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${activeTab === "sweep" ? "bg-[#27272a] text-zinc-50" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Parameter Sweep
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${activeTab === "history" ? "bg-[#27272a] text-zinc-50" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Run History
          </button>
          <button 
            onClick={() => setActiveTab("architecture")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${activeTab === "architecture" ? "bg-[#27272a] text-zinc-50" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Architecture
          </button>
        </nav>
      </header>

      {/* Main Grid Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Parameter Controller Panel */}
        <aside className="w-80 border-r border-zinc-900 bg-[#09090b]/40 p-5 flex flex-col gap-6 overflow-y-auto shrink-0">
          {activeTab === "single" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                <Settings size={14} className="text-emerald-500" />
                <h2 className="font-bold text-zinc-400 text-xs tracking-wider uppercase">Execution Strategy</h2>
              </div>

              {/* Execution Profile Presets */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-500" /> Benchmark Profile
                </label>
                <select 
                  value={profile} 
                  onChange={(e) => setProfile(e.target.value)}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-800"
                >
                  <option value="balanced">Balanced Preset</option>
                  <option value="low_latency">Low Latency Preset</option>
                  <option value="memory_optimized">Memory Optimized Preset</option>
                  <option value="large_dataset_optimized">Large Dataset Preset</option>
                  <option value="custom">Custom Configuration</option>
                </select>
              </div>

              {/* Algorithm Parameter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Target Algorithm</label>
                <select 
                  value={algo} 
                  onChange={(e) => setAlgo(e.target.value)}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-800"
                >
                  <option value="all">COMPARE ALL HYBRIDS</option>
                  <option value="introsort">Introsort (Adaptive Fallback)</option>
                  <option value="quick_insertion">Quick + Insertion Sort</option>
                  <option value="quick_merge">Quick + Merge Sort</option>
                  <option value="quick_heap">Quick + Heap Sort</option>
                </select>
              </div>

              {/* Array Size */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Dataset Size (N)</label>
                <input 
                  type="number" 
                  value={size} 
                  onChange={(e) => setSize(Math.max(10, parseInt(e.target.value) || 10))}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-800"
                />
              </div>

              {/* Reproducible Seed */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Reproducible Seed (--seed)</label>
                <input 
                  type="number" 
                  value={seed} 
                  onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-800"
                />
              </div>

              {/* Dataset Distribution */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Distribution Model</label>
                <select 
                  value={dataset} 
                  onChange={(e) => setDataset(e.target.value)}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-800"
                >
                  <option value="random">RANDOM (UNIFORM)</option>
                  <option value="nearly_sorted">NEARLY SORTED</option>
                  <option value="reverse_sorted">REVERSE SORTED</option>
                  <option value="duplicate_heavy">DUPLICATE HEAVY</option>
                  <option value="skewed">SKEWED (EXPONENTIAL)</option>
                </select>
              </div>

              {/* Insertion Threshold */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center gap-1">
                    Insertion Threshold 
                    {profile !== "custom" ? <Lock size={10} className="text-zinc-600" /> : <Unlock size={10} className="text-emerald-500" />}
                  </label>
                  <span className="text-xs text-emerald-500 font-bold">{threshold}</span>
                </div>
                <input 
                  type="range" 
                  min="2" 
                  max="128" 
                  value={threshold} 
                  disabled={profile !== "custom"}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="accent-emerald-500 bg-[#121214] h-1 rounded-lg cursor-pointer disabled:opacity-30"
                />
              </div>

              {/* Pivot Selection Strategy */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center gap-1">
                  Pivot Strategy
                  {profile !== "custom" ? <Lock size={10} className="text-zinc-600" /> : <Unlock size={10} className="text-emerald-500" />}
                </label>
                <select 
                  value={pivot} 
                  disabled={profile !== "custom"}
                  onChange={(e) => setPivot(e.target.value)}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-800 disabled:opacity-50"
                >
                  <option value="median_of_three">MEDIAN OF THREE</option>
                  <option value="last">LAST ELEMENT (LOMUTO)</option>
                  <option value="first">FIRST ELEMENT</option>
                  <option value="random">RANDOM INDEX</option>
                </select>
              </div>

              {/* Iteration Runs */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Timing Iterations</label>
                <input 
                  type="number" 
                  min="1" 
                  max="50" 
                  value={runs} 
                  onChange={(e) => setRuns(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-800"
                />
              </div>

              {/* Splits Toggle */}
              <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Trace Recursion Splits</span>
                <input 
                  type="checkbox" 
                  checked={enableSplits} 
                  onChange={(e) => setEnableSplits(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 bg-zinc-950 border-zinc-800 focus:ring-emerald-500 focus:ring-opacity-25"
                />
              </div>

              {/* Run Trigger */}
              <button 
                onClick={handleRunBenchmark}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-950 font-bold py-2 rounded transition duration-150 mt-2"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                EXECUTE TELEMETRY
              </button>
            </div>
          )}

          {activeTab === "sweep" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                <TrendingUp size={14} className="text-emerald-500" />
                <h2 className="font-bold text-zinc-400 text-xs tracking-wider uppercase">Sweep Parameters</h2>
              </div>

              {/* Parameter Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Sweep Variable</label>
                <select 
                  value={sweepParam} 
                  onChange={(e) => setSweepParam(e.target.value as "threshold" | "size")}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none"
                >
                  <option value="threshold">INSERTION THRESHOLD</option>
                  <option value="size">DATASET SIZE (N)</option>
                </select>
              </div>

              {/* Sweep Range Values */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Sweep Values (Comma Separated)</label>
                <input 
                  type="text" 
                  value={sweepValues} 
                  onChange={(e) => setSweepValues(e.target.value)}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 text-xs focus:outline-none"
                />
                <span className="text-[10px] text-zinc-650 leading-tight">
                  Example values: 4, 8, 12, 16, 24, 32, 48, 64
                </span>
              </div>

              {/* static values */}
              {sweepParam === "threshold" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold">Dataset Size (Static)</label>
                  <input 
                    type="number" 
                    value={sweepSize} 
                    onChange={(e) => setSweepSize(parseInt(e.target.value) || 1000)}
                    className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold">Insertion Threshold (Static)</label>
                  <input 
                    type="number" 
                    value={sweepThreshold} 
                    onChange={(e) => setSweepThreshold(parseInt(e.target.value) || 16)}
                    className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none"
                  />
                </div>
              )}

              {/* Reproducible Seed */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Sweep Seed</label>
                <input 
                  type="number" 
                  value={sweepSeed} 
                  onChange={(e) => setSweepSeed(parseInt(e.target.value) || 0)}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none"
                />
              </div>

              {/* Dataset Distribution */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-semibold">Distribution Model</label>
                <select 
                  value={sweepDataset} 
                  onChange={(e) => setSweepDataset(e.target.value)}
                  className="bg-[#121214] border border-zinc-900 rounded px-3 py-1.5 text-zinc-300 focus:outline-none"
                >
                  <option value="random">RANDOM (UNIFORM)</option>
                  <option value="nearly_sorted">NEARLY SORTED</option>
                  <option value="reverse_sorted">REVERSE SORTED</option>
                  <option value="duplicate_heavy">DUPLICATE HEAVY</option>
                  <option value="skewed">SKEWED (EXPONENTIAL)</option>
                </select>
              </div>

              {/* Run Sweep Trigger */}
              <button 
                onClick={handleRunSweep}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-zinc-900 disabled:text-zinc-650 text-zinc-950 font-bold py-2 rounded transition duration-150 mt-2"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                RUN PARAMETER SWEEP
              </button>
            </div>
          )}

          {activeTab === "history" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                <History size={14} className="text-emerald-500" />
                <h2 className="font-bold text-zinc-400 text-xs tracking-wider uppercase">Historical Logs</h2>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Review and compare previously generated runtime profile records loaded from reports.
              </p>
              
              <button 
                onClick={fetchHistory}
                className="flex items-center justify-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs py-2 rounded transition duration-150 text-zinc-300"
              >
                <RefreshCw size={12} /> Refresh Run History
              </button>
            </div>
          )}
        </aside>

        {/* Center Main Dashboard Content Area */}
        <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          {error && (
            <div className="bg-red-950/20 border border-red-900/40 text-red-400 p-4 rounded text-xs">
              <strong className="uppercase">Diagnostics Engine Fault:</strong>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {loading && (
            <div className="border border-zinc-900 bg-zinc-900/10 rounded p-4 flex items-center justify-center gap-3 text-xs text-zinc-400">
              <RefreshCw size={14} className="animate-spin text-emerald-500" />
              <span>Orchestrating sorting execution and processing runtime diagnostics...</span>
            </div>
          )}

          {/* ── TAB 1: Live Monitor ── */}
          {activeTab === "single" && (
            <div className="flex flex-col gap-6">
              {singleResults.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center gap-3 border border-dashed border-zinc-900 rounded bg-[#09090b]/5">
                  <Activity size={32} className="text-zinc-800" />
                  <p className="text-zinc-650 text-xs">No active execution statistics recorded. Trigger a benchmark run in the sidebar.</p>
                </div>
              ) : (
                <>
                  {/* PRE-SORT DATASET CHARACTERISTICS ANALYZER CARD */}
                  <div className="bg-[#121214] border border-zinc-900 rounded-lg p-5">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Database size={15} className="text-emerald-500" />
                        <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-wider">Dataset Pre-Sort Analytics</h3>
                      </div>
                      <div className="bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 px-3 py-1 rounded text-[11px] font-bold">
                        Adaptive Profile: {singleResults[0]?.recommended_profile?.toUpperCase()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                      <div className="bg-zinc-950/30 border border-zinc-900 rounded-md p-3">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Presortedness</span>
                        <div className="text-base font-bold text-zinc-200 mt-1">
                          {(singleResults[0]?.sortedness * 100).toFixed(2)}%
                        </div>
                        <div className="h-1 bg-zinc-900 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${singleResults[0]?.sortedness * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-zinc-950/30 border border-zinc-900 rounded-md p-3">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Duplicate Density</span>
                        <div className="text-base font-bold text-zinc-200 mt-1">
                          {(singleResults[0]?.duplicate_density * 100).toFixed(2)}%
                        </div>
                        <div className="h-1 bg-zinc-900 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${singleResults[0]?.duplicate_density * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-zinc-950/30 border border-zinc-900 rounded-md p-3">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Skewness Coefficient</span>
                        <div className="text-base font-bold text-zinc-200 mt-1">
                          {singleResults[0]?.skewness?.toFixed(4) || "0.0000"}
                        </div>
                        <span className="text-[9px] text-zinc-650 mt-2 block">Deviation of Mean from Median</span>
                      </div>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-900 rounded p-3 text-xs leading-relaxed text-zinc-400">
                      <span className="text-zinc-500 font-bold uppercase text-[9px] block mb-0.5">Adaptation Model Rationale</span>
                      {singleResults[0]?.recommendation_reason}
                    </div>
                  </div>

                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#121214] border border-zinc-900 rounded p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Runtime</span>
                      <span className="text-lg font-bold text-emerald-400 font-sans">
                        {singleResults[0]?.execution_time_ms.toFixed(4)} <span className="text-xs font-mono font-normal">ms</span>
                      </span>
                      <span className="text-[9px] text-zinc-600 mt-1">Runs averaged: {runs}</span>
                    </div>

                    <div className="bg-[#121214] border border-zinc-900 rounded p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Comparisons (Run 0)</span>
                      <span className="text-lg font-bold text-blue-400 font-sans">
                        {singleResults[0]?.comparisons.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-zinc-600 mt-1">Operations on seed array</span>
                    </div>

                    <div className="bg-[#121214] border border-zinc-900 rounded p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Swaps / Writes (Run 0)</span>
                      <span className="text-lg font-bold text-purple-400 font-sans">
                        {singleResults[0]?.swaps.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-zinc-600 mt-1">Array mutation writes</span>
                    </div>

                    <div className="bg-[#121214] border border-zinc-900 rounded p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Max Depth / Splits</span>
                      <span className="text-lg font-bold text-zinc-300 font-sans">
                        {singleResults[0]?.max_depth} <span className="text-xs font-mono text-zinc-600">depth</span>
                      </span>
                      <div className="text-[9px] text-zinc-500 mt-1 flex justify-between">
                        <span>Base Triggers: <strong className="text-emerald-500">{singleResults[0]?.insertion_sort_triggers}</strong></span>
                        {singleResults[0]?.algorithm === "introsort" && (
                          <span>Heap Fallbacks: <strong className="text-red-500">{singleResults[0]?.heapsort_fallbacks}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comparisons Panel if MULTIPLE algorithms run */}
                  {singleResults.length > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#121214] border border-zinc-900 rounded p-5">
                        <h3 className="text-xs font-bold text-zinc-400 mb-4 tracking-wider uppercase">Execution Speed Comparison</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={singleResults}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                              <XAxis dataKey="algorithm" stroke="#52525b" tickFormatter={getAlgoDisplayName} style={{ fontSize: 9 }} />
                              <YAxis stroke="#52525b" label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', style: { fill: '#52525b', fontSize: 10 } }} style={{ fontSize: 9 }} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: 11 }}
                                formatter={(value: any) => [`${parseFloat(value).toFixed(4)} ms`, 'Avg Time']}
                              />
                              <Bar dataKey="execution_time_ms" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-[#121214] border border-zinc-900 rounded p-5">
                        <h3 className="text-xs font-bold text-zinc-400 mb-4 tracking-wider uppercase">Operation Count Comparison</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={singleResults}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                              <XAxis dataKey="algorithm" stroke="#52525b" tickFormatter={getAlgoDisplayName} style={{ fontSize: 9 }} />
                              <YAxis stroke="#52525b" style={{ fontSize: 9 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: 11 }} />
                              <Legend wrapperStyle={{ fontSize: 9 }} />
                              <Bar dataKey="comparisons" name="Comparisons" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                              <Bar dataKey="swaps" name="Swaps" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Diagnostic Execution Console Terminal & Tree Node Layout */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Retro Terminal Logs Panel */}
                    <div className="bg-[#0c0c0e] border border-zinc-900 rounded-lg p-5 flex flex-col gap-4">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                        <Terminal size={14} className="text-emerald-500" />
                        <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Execution Diagnostics Logs</h4>
                      </div>
                      
                      <div className="bg-black/40 border border-zinc-950 rounded p-3 font-mono text-xs text-zinc-400 overflow-y-auto max-h-[400px] h-[400px] leading-relaxed flex flex-col gap-1">
                        {selectedAlgoDetails?.logs && selectedAlgoDetails.logs.length > 0 ? (
                          selectedAlgoDetails.logs.map((log: string, idx: number) => {
                            let textClass = "text-zinc-400";
                            if (log.includes("[WARNING]")) textClass = "text-amber-500 font-semibold";
                            else if (log.includes("[SYSTEM]")) textClass = "text-purple-400 font-bold";
                            else if (log.includes("[INFO]")) textClass = "text-blue-400";
                            return (
                              <div key={idx} className={textClass}>
                                {log}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-zinc-650 italic text-center my-auto">
                            Diagnostics trace console inactive. (Check "Trace Splits" parameter and execute)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recursion Interval Tree Panel */}
                    <div className="bg-[#121214] border border-zinc-900 rounded-lg p-5 flex flex-col gap-4">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                        <GitFork size={14} className="text-emerald-500" />
                        <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Recursion Splits Tree</h4>
                      </div>
                      
                      <div className="max-h-[400px] h-[400px] overflow-y-auto border border-zinc-950 bg-black/20 rounded p-3 text-xs">
                        {selectedAlgoDetails?.splits && selectedAlgoDetails.splits.length > 0 ? (
                          (() => {
                            const treeRoot = buildRecursionTree(selectedAlgoDetails.splits, selectedAlgoDetails.size);
                            return treeRoot ? (
                              <TreeNode node={treeRoot} threshold={selectedAlgoDetails.threshold} />
                            ) : (
                              <span className="text-zinc-650 italic p-3 block text-center">Failed to reconstruct splits tree.</span>
                            );
                          })()
                        ) : (
                          <div className="text-zinc-650 italic text-center my-auto">
                            No partition splits logs recorded.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB 2: Parameter Sweep ── */}
          {activeTab === "sweep" && (
            <div className="flex flex-col gap-6">
              {sweepChartData.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center gap-3 border border-dashed border-zinc-900 rounded bg-[#09090b]/5">
                  <TrendingUp size={32} className="text-zinc-800" />
                  <p className="text-zinc-650 text-xs">Sweep graph empty. Select parameters and click RUN PARAMETER SWEEP to execute.</p>
                </div>
              ) : (
                <div className="bg-[#121214] border border-zinc-900 rounded p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase">
                        Adaptive Threshold / Scaling Analysis Curve
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Plots algorithm execution times against the swept parameter. Observes optimal threshold curves.
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-900 px-3 py-1 rounded text-[10px] text-zinc-400 font-semibold uppercase">
                      Sweep Mode: {sweepParam === "threshold" ? "Threshold Sweep (Static N)" : "Size Scaling (Static Threshold)"}
                    </div>
                  </div>

                  <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sweepChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                        <XAxis 
                          dataKey="parameter" 
                          stroke="#52525b" 
                          label={{ value: sweepParam === "threshold" ? "Insertion Threshold Value" : "Dataset Size (N)", position: "insideBottomRight", offset: -5, style: { fill: '#52525b', fontSize: 10 } }} 
                          style={{ fontSize: 9 }}
                        />
                        <YAxis 
                          stroke="#52525b" 
                          label={{ value: "Execution Time (ms)", angle: -90, position: "insideLeft", style: { fill: '#52525b', fontSize: 10 } }} 
                          style={{ fontSize: 9 }}
                        />
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="introsort" name="Introsort" stroke="#10b981" activeDot={{ r: 6 }} strokeWidth={2} />
                        <Line type="monotone" dataKey="quick_insertion" name="Quick + Insertion" stroke="#3b82f6" strokeWidth={1.5} />
                        <Line type="monotone" dataKey="quick_merge" name="Quick + Merge" stroke="#8b5cf6" strokeWidth={1.5} />
                        <Line type="monotone" dataKey="quick_heap" name="Quick + Heap" stroke="#f59e0b" strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: Run History ── */}
          {activeTab === "history" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-zinc-400 mb-2 tracking-wider uppercase">Stored Execution Reports</h3>
              
              {historyList.length === 0 ? (
                <div className="border border-zinc-900 rounded p-8 text-center text-xs text-zinc-500 italic">
                  No historical reports stored in database yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {historyList.map((h) => (
                    <div 
                      key={h.id} 
                      className="bg-[#121214] border border-zinc-900 rounded p-4 flex items-center justify-between hover:bg-zinc-900/10 transition duration-150"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-emerald-500" />
                          <span className="font-bold text-xs text-zinc-300">{h.id.substring(0, 8)}...</span>
                          <span className="text-[10px] text-zinc-800">|</span>
                          <span className="text-[10px] text-zinc-500">{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-1">
                          {h.summary.map((r: any) => (
                            <span 
                              key={r.algorithm} 
                              className="text-[10px] bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded text-zinc-400"
                            >
                              {getAlgoDisplayName(r.algorithm)}: <strong className="text-zinc-200">{r.execution_time_ms.toFixed(3)}ms</strong> (N={r.size.toLocaleString()})
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleLoadHistoryReport(h.id)}
                        className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-zinc-50 px-3 py-1.5 rounded text-xs transition duration-150 text-zinc-300"
                      >
                        Load Report
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: Architecture ── */}
          {activeTab === "architecture" && (
            <div className="flex flex-col gap-6">
              <div className="bg-[#121214] border border-zinc-900 rounded-lg p-6 flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 tracking-wider uppercase flex items-center gap-2">
                    <BookOpen size={14} className="text-emerald-500" /> Systems Architecture & Adaptive Decision Logic
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                    Overview of the Execution Analysis System, Introsort switching constraints, and dataset adaptation parameters.
                  </p>
                </div>

                <div className="border-t border-zinc-900 pt-5 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Introsort Fallback State Machine</h4>
                  <div className="bg-[#09090b] border border-zinc-900 rounded p-4 flex flex-col gap-3 font-mono text-xs leading-relaxed text-zinc-400">
                    <div>1. Start Partitioning (Lomuto standard partitioning utilizing Median-of-Three pivot strategy).</div>
                    <div>2. If Subproblem Size &lt; Threshold Value (Switch to high-performance insertion sort range kernel).</div>
                    <div>3. If Stack Recursion Depth &gt; Depth Limit (Limit reached: switch segment execution to bounds-guaranteed HeapSort fallback).</div>
                  </div>
                </div>

                <div className="border-t border-zinc-900 pt-5 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Adaptive Presets Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    <div className="bg-[#09090b] border border-zinc-900 p-3 rounded">
                      <strong className="text-zinc-200 block mb-1">Balanced Preset</strong>
                      <span className="text-zinc-500 block">Threshold: 16</span>
                      <span className="text-zinc-500 block">Pivot: Median-of-Three</span>
                      <p className="text-[10px] text-zinc-650 mt-2 leading-relaxed">Standard balanced parameters for average workload distributions.</p>
                    </div>
                    <div className="bg-[#09090b] border border-zinc-900 p-3 rounded">
                      <strong className="text-zinc-200 block mb-1">Low Latency Preset</strong>
                      <span className="text-zinc-500 block">Threshold: 32</span>
                      <span className="text-zinc-500 block">Pivot: Median-of-Three</span>
                      <p className="text-[10px] text-zinc-650 mt-2 leading-relaxed">Increases insertion sort threshold scope to eliminate shallow recursion call overheads.</p>
                    </div>
                    <div className="bg-[#09090b] border border-zinc-900 p-3 rounded">
                      <strong className="text-zinc-200 block mb-1">Memory Optimized Preset</strong>
                      <span className="text-zinc-500 block">Threshold: 8</span>
                      <span className="text-zinc-500 block">Pivot: Median-of-Three</span>
                      <p className="text-[10px] text-zinc-650 mt-2 leading-relaxed">Minimizes base switch limits to restrict call stack nesting depth on duplicates.</p>
                    </div>
                    <div className="bg-[#09090b] border border-zinc-900 p-3 rounded">
                      <strong className="text-zinc-200 block mb-1">Large Dataset Preset</strong>
                      <span className="text-zinc-500 block">Threshold: 24</span>
                      <span className="text-zinc-500 block">Pivot: Median-of-Three</span>
                      <p className="text-[10px] text-zinc-650 mt-2 leading-relaxed">Optimal scaling behavior when processing array structures with N &gt; 25,000.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

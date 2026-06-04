import os
import subprocess
import json
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Hybrid Sorting Systems & Performance Engineering API",
    description="Stateless backend API for executing, comparing, and optimizing hybrid sorting algorithms.",
    version="3.0.0"
)

# Enable CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BINARY_PATH = os.path.join(BASE_DIR, "benchmark.exe")

class DatasetMetricsModel(BaseModel):
    sortedness: float
    duplicate_ratio: float
    inversion_count: int
    distribution_type: str
    recommended_hybrid: str
    recommendation_reason: str

class BenchmarkRequest(BaseModel):
    algo: Optional[str] = Field(default=None, description="Legacy field for single algorithm name")
    algos: Optional[List[str]] = Field(default=None, description="List of algorithms to benchmark")
    size: int = Field(default=10000, description="Size of dataset")
    dataset: str = Field(default="random", description="Type of dataset")
    threshold: int = Field(default=16, description="Insertion sort/Merge sort threshold")
    pivot: str = Field(default="median_of_three", description="Pivot selection strategy")
    runs: int = Field(default=5, description="Number of runs to average")
    seed: int = Field(default=42, description="Random seed")

class BenchmarkResult(BaseModel):
    algorithm: str
    dataset: str
    size: int
    threshold: int
    pivot_strategy: str
    runs: int
    execution_time_ms: float
    comparisons: int
    swaps: int
    max_depth: int
    insertion_sort_triggers: int
    heapsort_fallbacks: int
    partition_balance: float
    memory_usage_bytes: int
    seed: int
    dataset_metrics: DatasetMetricsModel

class BenchmarkResponse(BaseModel):
    results: List[BenchmarkResult]

class OptimizeRequest(BaseModel):
    algo: str = Field(default="introsort")
    size: int = Field(default=10000)
    dataset: str = Field(default="random")
    pivot: str = Field(default="median_of_three")
    runs: int = Field(default=3)
    seed: int = Field(default=42)
    thresholds: List[int] = Field(default=[4, 8, 12, 16, 24, 32, 48, 64])

class ThresholdResult(BaseModel):
    threshold: int
    execution_time_ms: float
    comparisons: int
    swaps: int

class OptimizeResponse(BaseModel):
    optimal_threshold: int
    optimal_time_ms: float
    sweep_data: List[ThresholdResult]

def ensure_binary_compiled():
    if not os.path.exists(BINARY_PATH):
        print("benchmark.exe not found. Attempting to compile C++ source files...")
        src_files = [
            "core/benchmarks/benchmark_engine.cpp",
            "core/utils/sorting_common.cpp",
            "core/introsort/introsort.cpp",
            "core/quick_insertion/quick_insertion.cpp",
            "core/quick_merge/quick_merge.cpp",
            "core/quick_heap/quick_heap.cpp",
            "core/datasets/dataset_generator.cpp"
        ]
        cmd = ["g++", "-O3", "-std=c++17", "-o", BINARY_PATH] + src_files
        try:
            subprocess.run(cmd, cwd=BASE_DIR, capture_output=True, text=True, check=True)
            print("Successfully compiled benchmark.exe!")
        except subprocess.CalledProcessError as e:
            print(f"Failed to compile benchmark.exe: {e.stderr}")
            raise RuntimeError(f"C++ Compilation failed: {e.stderr}")

@app.post("/api/benchmark", response_model=BenchmarkResponse)
def run_benchmark(req: BenchmarkRequest):
    ensure_binary_compiled()
    
    # Extract candidate algorithms
    selected_algos = []
    if req.algos:
        selected_algos = req.algos
    elif req.algo:
        if req.algo == "all":
            selected_algos = ["quicksort", "mergesort", "heapsort", "quick_insertion", "quick_merge", "introsort"]
        else:
            selected_algos = [req.algo]
    else:
        selected_algos = ["introsort"]

    # Map target algorithm keys to their C++ execution configurations
    mapped_runs = []
    for a in selected_algos:
        if a == "quicksort":
            mapped_runs.append({"cpp_algo": "quick_insertion", "cpp_threshold": 1, "label": "quicksort"})
        elif a == "mergesort":
            mapped_runs.append({"cpp_algo": "quick_merge", "cpp_threshold": req.size, "label": "mergesort"})
        elif a == "heapsort":
            mapped_runs.append({"cpp_algo": "quick_heap", "cpp_threshold": req.size, "label": "heapsort"})
        elif a == "quick_insertion":
            mapped_runs.append({"cpp_algo": "quick_insertion", "cpp_threshold": req.threshold, "label": "quick_insertion"})
        elif a == "quick_merge":
            mapped_runs.append({"cpp_algo": "quick_merge", "cpp_threshold": req.threshold, "label": "quick_merge"})
        elif a == "introsort":
            mapped_runs.append({"cpp_algo": "introsort", "cpp_threshold": req.threshold, "label": "introsort"})
        else:
            mapped_runs.append({"cpp_algo": a, "cpp_threshold": req.threshold, "label": a})

    results = []
    for run in mapped_runs:
        args = [
            BINARY_PATH,
            "--algo", run["cpp_algo"],
            "--size", str(req.size),
            "--dataset", req.dataset,
            "--threshold", str(run["cpp_threshold"]),
            "--pivot", req.pivot,
            "--runs", str(req.runs),
            "--seed", str(req.seed)
        ]
        
        try:
            res = subprocess.run(args, capture_output=True, text=True, check=True)
            run_output = json.loads(res.stdout)
            if run_output:
                # Format response label and restore displayed threshold
                item = run_output[0]
                item["algorithm"] = run["label"]
                if run["label"] in ["quicksort", "mergesort", "heapsort"]:
                    item["threshold"] = req.threshold
                results.append(item)
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"C++ execution failed for {run['label']}: {e.stderr}")
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"JSON decode failed for {run['label']}: {e.msg}")

    return {"results": results}

@app.post("/api/optimize-threshold", response_model=OptimizeResponse)
def optimize_threshold(req: OptimizeRequest):
    ensure_binary_compiled()
    sweep_data = []
    
    # Map target optimization algorithm
    cpp_algo = req.algo
    if req.algo == "quicksort" or req.algo == "quick_insertion":
        cpp_algo = "quick_insertion"
    elif req.algo == "mergesort" or req.algo == "quick_merge":
        cpp_algo = "quick_merge"
    elif req.algo == "heapsort" or req.algo == "quick_heap":
        cpp_algo = "quick_heap"

    for t in req.thresholds:
        args = [
            BINARY_PATH,
            "--algo", cpp_algo,
            "--size", str(req.size),
            "--dataset", req.dataset,
            "--threshold", str(t),
            "--pivot", req.pivot,
            "--runs", str(req.runs),
            "--seed", str(req.seed)
        ]
        try:
            res = subprocess.run(args, capture_output=True, text=True, check=True)
            results = json.loads(res.stdout)
            if results:
                r = results[0]
                sweep_data.append(ThresholdResult(
                    threshold=t,
                    execution_time_ms=r["execution_time_ms"],
                    comparisons=r["comparisons"],
                    swaps=r["swaps"]
                ))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Threshold optimization failed at threshold {t}: {str(e)}")
            
    if not sweep_data:
        raise HTTPException(status_code=400, detail="No optimization sweep data generated.")
        
    optimal_run = min(sweep_data, key=lambda x: x.execution_time_ms)
    
    return OptimizeResponse(
        optimal_threshold=optimal_run.threshold,
        optimal_time_ms=optimal_run.execution_time_ms,
        sweep_data=sweep_data
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

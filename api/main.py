import os
import sys
import subprocess
import json
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Hybrid Sorting & Observability API",
    description="Backend API for executing, tracking, and analyzing hybrid sorting algorithms.",
    version="1.0.0"
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
REPORTS_DIR = os.path.join(BASE_DIR, "results", "reports")

# Ensure directories exist
os.makedirs(REPORTS_DIR, exist_ok=True)

class BenchmarkRequest(BaseModel):
    algo: str = Field(default="introsort", description="Algorithm name (introsort, quick_insertion, quick_merge, quick_heap, or all)")
    size: int = Field(default=10000, description="Size of dataset")
    dataset: str = Field(default="random", description="Type of dataset (random, nearly_sorted, reverse_sorted, duplicate_heavy, skewed)")
    threshold: int = Field(default=16, description="Insertion sort/Merge sort threshold")
    pivot: str = Field(default="median_of_three", description="Pivot selection strategy (last, first, median_of_three, random)")
    runs: int = Field(default=5, description="Number of runs to average")
    enable_splits: bool = Field(default=False, description="Enable recursive partition splits tracking")
    seed: int = Field(default=42, description="Random seed for reproducibility")
    profile: str = Field(default="custom", description="Execution profile preset (balanced, low_latency, memory_optimized, large_dataset_optimized, custom)")

class BenchmarkResponse(BaseModel):
    id: str
    timestamp: str
    results: List[dict]

def ensure_binary_compiled():
    # If the binary does not exist, compile it
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
            res = subprocess.run(cmd, cwd=BASE_DIR, capture_output=True, text=True, check=True)
            print("Successfully compiled benchmark.exe!")
        except subprocess.CalledProcessError as e:
            print(f"Failed to compile benchmark.exe: {e.stderr}")
            raise RuntimeError(f"C++ Compilation failed: {e.stderr}")

def generate_markdown_report(report_data):
    results = report_data["results"]
    if not results:
        return
    
    first = results[0]
    sortedness = first.get("sortedness", 0.0)
    dup_density = first.get("duplicate_density", 0.0)
    skewness = first.get("skewness", 0.0)
    rec_profile = first.get("recommended_profile", "balanced")
    rec_reason = first.get("recommendation_reason", "")
    seed = first.get("seed", 42)
    dataset = first.get("dataset", "random")
    size = first.get("size", 10000)

    report_path = os.path.join(REPORTS_DIR, "benchmark_report.md")
    
    md_content = f"""# 📈 Adaptive Execution & Performance Report

Generated: {datetime.utcnow().isoformat()} UTC  
Experiment Seeding: `--seed {seed}`  
Dataset Profile: `{dataset}` (Size: {size:,})

---

## 🔍 Dataset Analytics & Decision Recommendation
* **Presortedness Score**: `{sortedness:.4f}` (1.0 = perfectly sorted)
* **Duplicate Value Ratio**: `{dup_density:.4f}` (0.0 = all unique values)
* **Distribution Skewness**: `{skewness:.4f}`
* **Recommended Switching Profile**: `{rec_profile.upper()}`
* **Decision Engine Rationale**: *"{rec_reason}"*

---

## ⚡ Algorithm Execution Profiling Summary

| Algorithm | Average Speed (ms) | Comparisons | Swaps / Writes | Max Stack Depth | Base Triggers | Fallbacks | Partition Balance |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
"""
    for r in results:
        algo_name = r["algorithm"].replace("_", " + ").title()
        triggers = r.get("insertion_sort_triggers", 0)
        fallbacks = r.get("heapsort_fallbacks", 0)
        balance = r.get("partition_balance", 0.5)
        
        md_content += f"| **{algo_name}** | {r['execution_time_ms']:.4f} | {r['comparisons']:,} | {r['swaps']:,} | {r['max_depth']} | {triggers} | {fallbacks} | {balance:.4f} |\n"

    md_content += """
---

## 📋 System Execution Log Excerpts
Below are the step-by-step partition analysis logs gathered from the execution kernel of the first profile run.
```txt
"""
    logs = first.get("logs", [])
    if logs:
        for log in logs[:35]:
            md_content += f"{log}\n"
        if len(logs) > 35:
            md_content += f"... ({len(logs) - 35} additional diagnostic log steps truncated) ...\n"
    else:
        md_content += "[Trace Recursion Splits was disabled for this run]\n"
        
    md_content += "```\n"

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(md_content)

@app.on_event("startup")
def startup_event():
    ensure_binary_compiled()

@app.post("/api/benchmark", response_model=BenchmarkResponse)
def run_benchmark(req: BenchmarkRequest):
    ensure_binary_compiled()
    
    # Construct arguments for subprocess
    args = [
        BINARY_PATH,
        "--algo", req.algo,
        "--size", str(req.size),
        "--dataset", req.dataset,
        "--threshold", str(req.threshold),
        "--pivot", req.pivot,
        "--runs", str(req.runs),
        "--seed", str(req.seed),
        "--profile", req.profile
    ]
    if req.enable_splits:
        args.append("--enable-splits")
        
    try:
        # Run binary and capture output
        res = subprocess.run(args, capture_output=True, text=True, check=True)
        results = json.loads(res.stdout)
        
        # Save results to a report file
        report_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        report_data = {
            "id": report_id,
            "timestamp": timestamp,
            "results": results
        }
        
        report_filename = f"report_{report_id}.json"
        report_filepath = os.path.join(REPORTS_DIR, report_filename)
        with open(report_filepath, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)
            
        # Write user-friendly Markdown report
        generate_markdown_report(report_data)
            
        return report_data
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"C++ Benchmark execution failed: {e.stderr}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse JSON from benchmark output: {e.msg}")

@app.get("/api/results")
def list_results(limit: int = 20):
    reports = []
    try:
        for file in os.listdir(REPORTS_DIR):
            if file.endswith(".json") and file.startswith("report_"):
                filepath = os.path.join(REPORTS_DIR, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for r in data.get("results", []):
                        if "splits" in r:
                            r["splits_count"] = len(r["splits"])
                            del r["splits"]
                        if "logs" in r:
                            r["logs_count"] = len(r["logs"])
                            del r["logs"]
                    reports.append({
                        "id": data["id"],
                        "timestamp": data["timestamp"],
                        "summary": data["results"]
                    })
        # Sort by timestamp descending
        reports.sort(key=lambda x: x["timestamp"], reverse=True)
        return reports[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading reports: {str(e)}")

@app.get("/api/results/{report_id}")
def get_result(report_id: str):
    filepath = os.path.join(REPORTS_DIR, f"report_{report_id}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Report not found")
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading report: {str(e)}")

@app.get("/api/metrics")
def get_metrics():
    total_runs = 0
    algorithms_performance = {}
    
    try:
        for file in os.listdir(REPORTS_DIR):
            if file.endswith(".json") and file.startswith("report_"):
                filepath = os.path.join(REPORTS_DIR, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for r in data.get("results", []):
                        algo = r["algorithm"]
                        time_ms = r["execution_time_ms"]
                        size = r["size"]
                        
                        if algo not in algorithms_performance:
                            algorithms_performance[algo] = {}
                        if size not in algorithms_performance[algo]:
                            algorithms_performance[algo][size] = []
                        
                        algorithms_performance[algo][size].append(time_ms)
                        total_runs += 1
                        
        summary = {}
        for algo, size_map in algorithms_performance.items():
            summary[algo] = {}
            for size, times in size_map.items():
                summary[algo][size] = sum(times) / len(times)
                
        return {
            "total_benchmarks_stored": total_runs,
            "average_performance": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error compiling metrics: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

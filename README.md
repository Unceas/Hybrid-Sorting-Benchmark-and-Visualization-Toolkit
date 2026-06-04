# Hybrid Sorting Benchmark & Analysis Platform

An engineering-focused benchmarking and analysis platform designed to evaluate and optimize hybrid sorting algorithms. The platform features optimized C++ sorting kernels, a stateless Python FastAPI orchestration api, and an interactive React-based benchmark laboratory dashboard to investigate algorithm thresholds, dataset characteristics, and execution behaviors.

---

## Architecture & Features

- **Core Sorting Engine (C++)**: High-performance implementations of hybrid sorting strategies:
  - **Introsort**: Initiates with QuickSort, switches to Insertion Sort on small ranges, and transitions to HeapSort if recursion depth exceeds the $2 \lfloor \log_2 N \rfloor$ safety bound.
  - **Quick + Insertion Sort**: Switches to Insertion Sort on subproblems below the threshold.
  - **Quick + Merge Sort**: Invokes an out-of-place Merge Sort on segments below the threshold, utilizing pre-allocated auxiliary space.
  - **Quick + Heap Sort**: Fallback to HeapSort on small ranges.
- **Automatic Threshold Optimization**: Sweeps across candidate threshold values to empirically determine the crossover point that minimizes execution cycles.
- **Dataset Intelligence Analysis**: Calculates pre-sort properties including inversion counts (using an $O(N \log N)$ merge-based algorithm), duplicate value ratios, and presortedness indices to recommend the optimal hybrid strategy.
- **Interactive Visual Decision Flows**: Visualizes algorithm logic paths and threshold crossover decisions.
- **Stateless Subprocess API Orchestration (FastAPI)**: Manages C++ compilation and executes benchmark commands.
- **Benchmark Laboratory Interface (Next.js + Recharts)**: Clean dark theme presenting tabular results, threshold crossover sweep charts, and winner matrices.
- **Report Generation**: Exports performance data directly as JSON, CSV, or clipboard-ready Markdown format.

---

## Getting Started

### 1. Compile and Run C++ CLI Directly
The C++ benchmark tool can be compiled and executed directly from the terminal:

```bash
# Compile sorting kernel files
g++ -O3 -std=c++17 -o benchmark.exe core/benchmarks/benchmark_engine.cpp core/utils/sorting_common.cpp core/introsort/introsort.cpp core/quick_insertion/quick_insertion.cpp core/quick_merge/quick_merge.cpp core/quick_heap/quick_heap.cpp core/datasets/dataset_generator.cpp

# Run benchmark
./benchmark.exe --algo all --size 50000 --dataset random --threshold 16 --runs 5 --seed 42
```

**CLI Command Options:**
* `--algo`: `introsort`, `quick_insertion`, `quick_merge`, `quick_heap`, or `all`
* `--size`: integer specifying array size
* `--dataset`: `random`, `nearly_sorted`, `reverse_sorted`, `duplicate_heavy`
* `--threshold`: integer threshold below which base-case sorts trigger
* `--pivot`: `median_of_three`, `last`, `first`, `random`
* `--runs`: number of iterations to average
* `--seed`: integer seed value for dataset generation
* `--format`: output format (`json` or `csv`)
* `--output`: optional path to save result file

---

## Installation & Server Start

### 2. Start the Backend API (FastAPI)
The backend compiles the C++ sorting executable if not present and handles execution commands:

```bash
# Install Python dependencies
pip install -r api/requirements.txt

# Run the api server
python api/main.py
```
* Server URL: `http://127.0.0.1:8000`
* Interactive API Docs: `http://127.0.0.1:8000/docs`

### 3. Start the Next.js Frontend
```bash
# Navigate to the frontend directory
cd frontend

# Install package dependencies
npm install

# Run the local development server
npm run dev
```
* Dashboard URL: `http://localhost:3000`

---

## Repository Layout

```txt
Hybrid-Sorting-Platform/
│
├── core/                       # High-performance C++ sorting modules
│   ├── introsort/              # Introsort hybrid
│   ├── quick_insertion/        # Quick + Insertion hybrid
│   ├── quick_merge/            # Quick + Merge hybrid
│   ├── quick_heap/             # Quick + Heap hybrid
│   ├── datasets/               # Dataset distributions generator
│   ├── utils/                  # Telemetry structures and partitioning helpers
│   └── benchmarks/             # C++ CLI driver
│
├── api/                        # FastAPI python orchestration backend
│
├── frontend/                   # Next.js & Recharts benchmark lab UI
│
├── docs/                       # Research and architecture docs
│
└── results/                    # Stored performance exports
```

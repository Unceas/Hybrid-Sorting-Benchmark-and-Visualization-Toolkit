# 🚀 Adaptive Hybrid Sorting & Runtime Optimization Infrastructure

A production-quality benchmarking, execution telemetry, and visualization platform for hybrid sorting algorithms. The project compiles high-performance C++ sorting kernels, manages them via a Python FastAPI orchestration server, and visualizes live sorting performance metrics and recursion trees in a dark-themed systems-observability dashboard.

---

## 📌 Architecture & Features

- **⚡ Core Sorting Engine (C++)**: Highly optimized implementations of:
  - **Introsort** (QuickSort switching to HeapSort on deep recursion limits, and Insertion Sort on small thresholds).
  - **Quick + Insertion Sort** (QuickSort switching to Insertion Sort).
  - **Quick + Merge Sort** (QuickSort switching to Merge Sort; features pre-allocated memory reuse to eliminate recursive allocation overhead).
  - **Quick + Heap Sort** (QuickSort switching to HeapSort).
- **📊 Real-time Telemetry Collection**: Captures comparisons, swaps, max depth, partition balance, insertion sort triggers, and heapsort fallbacks.
- **🌲 Recursion Tree Reconstruction**: Logs interval splits (`[low, high]`) inside the C++ stack and visualizes the tree structure interactively in the frontend.
- **🔌 Subprocess API Orchestration (FastAPI)**: Serves endpoints to run benchmarks, list historical runs, compile metrics, and automatically handles compilation of C++ source files.
- **📈 Observability UI Dashboard (Next.js + Tailwind + Recharts)**: Grafana-style dark control panel featuring live metric tracking, threshold sweeps (plotting threshold vs time to see the "sweet spot"), and interactive tree nodes.

---

## 🛠️ Getting Started

### 1. Compile and Run C++ CLI Directly
The C++ benchmark tool can be run as a standalone CLI:

```bash
# Compile all source files
g++ -O3 -std=c++17 -o benchmark.exe core/benchmarks/benchmark_engine.cpp core/utils/sorting_common.cpp core/introsort/introsort.cpp core/quick_insertion/quick_insertion.cpp core/quick_merge/quick_merge.cpp core/quick_heap/quick_heap.cpp core/datasets/dataset_generator.cpp

# Run benchmark
./benchmark.exe --algo introsort --size 100000 --dataset random --threshold 16 --runs 5 --enable-splits
```

**CLI Options:**
* `--algo`: `introsort`, `quick_insertion`, `quick_merge`, `quick_heap`, or `all`
* `--size`: array size (integer)
* `--dataset`: `random`, `nearly_sorted`, `reverse_sorted`, `duplicate_heavy`, `skewed`
* `--threshold`: partition size below which base-case sorts trigger
* `--pivot`: `median_of_three`, `last`, `first`, `random`
* `--runs`: number of iterations to average
* `--enable-splits`: log recursion intervals
* `--format`: `json` or `csv`
* `--output`: save to file path

---

### 2. Start the Backend API (FastAPI)
The backend manages CLI execution and stores reports.

```bash
# Navigate to workspace root or api directory
pip install -r api/requirements.txt

# Start uvicorn
python api/main.py
```
* The server will run at: `http://127.0.0.1:8000`
* Swagger docs are interactive at: `http://127.0.0.1:8000/docs`

---

### 3. Start the Observability UI (Next.js)
The frontend serves the dashboard.

```bash
# Navigate to frontend folder
cd frontend

# Install package dependencies
npm install

# Run the development server
npm run dev
```
* Open the browser at: `http://localhost:3000`

---

## 📂 Repository Layout

```txt
Hybrid-Sorting-Toolkit/
│
├── core/                       # High-performance C++ sorting modules
│   ├── introsort/              # Introsort hybrid
│   ├── quick_insertion/        # Quick + Insertion hybrid
│   ├── quick_merge/            # Quick + Merge hybrid (optimized)
│   ├── quick_heap/             # Quick + Heap hybrid
│   ├── datasets/               # Dataset distributions (random, skewed, etc.)
│   ├── utils/                  # Telemetry struct and partitioning helpers
│   └── benchmarks/             # C++ CLI driver
│
├── api/                        # FastAPI python orchestration backend
│
├── frontend/                   # Next.js & Recharts observability dashboard
│
├── visualizer/                 # Older python sorting animations
│
├── docs/                       # Performance analysis & architectural docs
│   ├── architecture/
│   ├── benchmarks/
│   └── methodology/
│
└── results/                    # Stored runs, report logs, and data
    └── reports/
```

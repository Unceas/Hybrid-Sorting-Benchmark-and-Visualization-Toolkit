# Hybrid Sorting

A minimalist performance-engineering laboratory designed to benchmark, visualize, and analyze hybrid sorting algorithms. The platform features optimized C++ sorting kernels, a stateless Python FastAPI orchestration api, and an interactive React-based benchmark dashboard to investigate algorithm thresholds, dataset characteristics, and execution behaviors.

---

## Features

- **Native performance kernels (C++)**: High-performance implementations of hybrid sorting strategies:
  - **Introsort**: Initiates with QuickSort, switches to Insertion Sort on small ranges, and transitions to HeapSort if recursion depth exceeds the safety limit.
  - **Quick + Insertion**: Switches to Insertion Sort on subproblems below the threshold.
  - **Quick + Merge**: Invokes an out-of-place Merge Sort on segments below the threshold, utilizing pre-allocated auxiliary space.
- **Diagnostics and telemetry**: Captures execution times, memory usage, comparisons count, swaps/mutations, and recursion depth.
- **Interactive sorting visualizer**: Live side-by-side execution canvas using a dedicated color mapping system (default gray, comparing white, active green, sorted light green).
- **Performance analysis**: Structured comparison metrics and threshold crossover curves presented in a clean, terminal-like Environment. 

---

## Getting Started

### 1. Compile and run C++ CLI directly
The C++ benchmark tool can be compiled and executed directly from the terminal:

```bash
# Compile sorting kernel files
g++ -O3 -std=c++17 -o benchmark.exe core/benchmarks/benchmark_engine.cpp core/utils/sorting_common.cpp core/introsort/introsort.cpp core/quick_insertion/quick_insertion.cpp core/quick_merge/quick_merge.cpp core/quick_heap/quick_heap.cpp core/datasets/dataset_generator.cpp

# Run benchmark
./benchmark.exe --algo all --size 50000 --dataset random --threshold 16 --runs 5 --seed 42
```

**CLI options:**
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

### 2. Start the backend api (FastAPI)
The backend compiles the C++ sorting executable if not present and handles execution commands:

```bash
# Install Python dependencies
pip install -r api/requirements.txt

# Run the api server
python api/main.py
```
* Server URL: `http://127.0.0.1:8000`

### 3. Start the Next.js frontend
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
Hybrid-Sorting/
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

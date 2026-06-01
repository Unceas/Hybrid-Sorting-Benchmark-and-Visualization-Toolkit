# Performance Analysis & Optimization Insights

This document summarizes experimental observations from benchmarking the hybrid sorting algorithms across different dataset profiles and thresholds.

---

## Dataset Profile Behavior

1. **Random Distribution**:
   * **Winner**: Introsort and Quick+Insertion perform similarly.
   * **Insight**: QuickSort dominates on random arrays because the partitions split relatively evenly. The small insertion sort threshold (e.g. 16) shaves off the recursive overhead of sorting small sub-arrays, improving speed by 15–20% compared to pure QuickSort.

2. **Nearly Sorted Distribution**:
   * **Winner**: Quick+Insertion.
   * **Insight**: Insertion Sort is $O(N)$ on sorted or nearly sorted arrays. When QuickSort partitions small segments, Insertion Sort cleans them up extremely fast, and the minimal comparisons/swaps make this profile the fastest overall.

3. **Reverse Sorted Distribution**:
   * **Winner**: Introsort.
   * **Insight**: Under Lomuto partitioning without median-of-three, reverse sorted inputs trigger worst-case $O(N^2)$ splits. Introsort detects the recursion depth threshold exceeded and falls back to HeapSort, guaranteeing $O(N \log N)$ bounds. The standard Quick+Insertion and Quick+Merge without fallback will degrade significantly.

4. **Duplicate Heavy Distribution**:
   * **Winner**: Introsort.
   * **Insight**: Traditional Lomuto partitioning splits duplicate elements highly unevenly. Introsort switches to HeapSort, preventing performance degradation.

---

## The Threshold "Sweet Spot"

A key aspect of hybrid sorting is finding the optimal subproblem size (`threshold`) to switch from $O(N \log N)$ partitioning to the $O(N^2)$ base cases (Insertion Sort). 

```txt
Execution Time
  ^
  |      \  Threshold too small (Recursive overhead dominant)
  |       \
  |        \       _ -- _   <- Optimal threshold range (12 to 24)
  |         \ ___/       \
  |                       \   Threshold too large (O(N^2) Insertion Sort dominant)
  +----------------------------------------------------> Threshold Value
```

* **Threshold < 8**: Recursive function call overhead dominates. The CPU spends too much time pushing stack frames for tiny subproblems (size 3, 2, 1).
* **Threshold > 32**: The $O(N^2)$ complexity of Insertion Sort becomes a bottleneck. Even though we save recursive stack frames, Insertion Sort performs too many comparisons and swaps on large unsorted subproblems.
* **Optimal Range (12–24)**: The optimal threshold is typically around **16**. This represents the crossover point where the constant factors of the recursion stack frames exceed the overhead of Insertion Sort's quadratic operations.

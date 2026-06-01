# Telemetry Metrics and Methodology

The toolkit extracts detailed execution logs directly from the C++ stack using the `SortTelemetry` class. This document details how each metric is measured and what it represents.

---

## Metric Reference

### 1. Execution Time (`execution_time_ms`)
* **Measurement**: Using C++ `std::chrono::high_resolution_clock`, we capture the timestamp directly before and after the sorting algorithm runs.
* **Averaging**: The orchestrator performs a user-configured number of runs (default 5) and reports the arithmetic mean to filter out system scheduling jitter.
* **Accuracy**: Microsecond/Nanosecond resolution on host hardware.

### 2. Comparisons (`comparisons`)
* **Measurement**: Increments every time two element values are evaluated against each other (e.g. `arr[j] <= pivot`, `aux[i] <= aux[j]`, or finding the median of three).
* **Significance**: Core complexity indicator for comparisons-based sorting.

### 3. Swaps / Writes (`swaps`)
* **Measurement**: Increments whenever elements are swapped in memory (e.g. `std::swap`) or when values are rewritten (e.g. elements copied from auxiliary arrays during merging).
* **Significance**: Represents memory bandwidth consumption.

### 4. Partition Balance (`partition_balance`)
* **Calculation**: For each partition step, we measure the size of the smaller sub-partition relative to the parent partition size:
  $$\text{Balance} = \frac{\min(L, R)}{L + R + 1}$$
  Where $L$ and $R$ are the sizes of the left and right sub-problems.
* **Telemetry**: The CLI averages this balance across all partition steps.
* **Interpretation**:
  * **0.5**: Perfect balance (the pivot split the array exactly in half).
  * **0.0**: Worst-case balance (the pivot was the minimum/maximum element).

### 5. Maximum Stack Depth (`max_depth`)
* **Measurement**: Tracked dynamically using a depth counter passed along recursive calls.
* **Significance**: Monitors stack space complexity and verifies that tail-recursion optimization keeps stack usage below $O(\log N)$.

### 6. Subproblem Switch Triggers
* **Insertion Sort Triggers**: Increments every time a partition's size drops below the configured `threshold` and the engine pivots to Insertion Sort.
* **HeapSort Fallbacks**: Only active in Introsort. Increments if the recursion depth limit ($2 \log_2 N$) is reached, triggering HeapSort to prevent worst-case $O(N^2)$ behavior.

---

## Recursion Tree Reconstruction

When `enable_splits` is set to `true`, the C++ engine appends a `{low, high, pivot_index, depth}` record to the telemetry log for every partition split.

The Next.js frontend reconstructs this flat log into a hierarchical interval tree using an $O(S \log S)$ algorithm where $S$ is the number of splits:
1. Reconstruct root range `[0, N-1]`.
2. Find the split log that matches `low` and `high` at the current depth.
3. Split the range into `[low, pivot_index - 1]` and `[pivot_index + 1, high]`.
4. Recursively build child nodes. If no split exists for a range, it is rendered as a terminal leaf (e.g., Insertion Sort or HeapSort range).
5. Colors are applied based on the partition size:
   * Blue: Active QuickSort partition splits.
   * Green: Leaf nodes sorted by Insertion Sort.
   * Orange/Red: Fallback HeapSort ranges.

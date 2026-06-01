#include "introsort.h"
#include <cmath>
#include <algorithm>

void introSortUtil(std::vector<int>& arr, int low, int high, int depthLimit, const SortConfig& config, SortTelemetry& telemetry, int depth) {
    if (depth > telemetry.maxDepth) {
        telemetry.maxDepth = depth;
    }
    while (low < high) {
        int size = high - low + 1;
        if (size < config.insertionThreshold) {
            if (config.enableSplitsLog) {
                telemetry.logs.push_back("[INFO] Depth " + std::to_string(depth) + ": Subproblem size " + std::to_string(size) + " < " + std::to_string(config.insertionThreshold) + " -> Insertion Sort base case.");
            }
            insertionSort(arr, low, high, telemetry);
            return;
        }

        if (depthLimit == 0) {
            if (config.enableSplitsLog) {
                telemetry.logs.push_back("[WARNING] Depth " + std::to_string(depth) + ": Depth limit reached on range [" + std::to_string(low) + ", " + std::to_string(high) + "] -> Falling back to HeapSort.");
            }
            heapSortRange(arr, low, high, telemetry);
            return;
        }

        int p = partition(arr, low, high, config.pivotStrategy, telemetry);
        if (config.enableSplitsLog) {
            telemetry.splits.push_back({low, high, p, depth});
            telemetry.logs.push_back("[DEBUG] Depth " + std::to_string(depth) + ": Partitioned [" + std::to_string(low) + ", " + std::to_string(high) + "] at pivot index " + std::to_string(p) + ".");
        }

        int leftSize = p - low;
        int rightSize = high - p;
        double balance = static_cast<double>(std::min(leftSize, rightSize)) / std::max(1, size);
        telemetry.totalPartitionBalance += balance;
        telemetry.partitionCount++;

        --depthLimit;
        if (leftSize < rightSize) {
            introSortUtil(arr, low, p - 1, depthLimit, config, telemetry, depth + 1);
            low = p + 1;
        } else {
            introSortUtil(arr, p + 1, high, depthLimit, config, telemetry, depth + 1);
            high = p - 1;
        }
    }
}

void introSort(std::vector<int>& arr, const SortConfig& config, SortTelemetry& telemetry) {
    if (arr.empty()) return;
    int n = static_cast<int>(arr.size());
    int depthLimit = 2 * static_cast<int>(std::log2(std::max(2, n)));
    if (config.enableSplitsLog) {
        telemetry.logs.push_back("[SYSTEM] Introsort pipeline started. Size N = " + std::to_string(n) + ", Recursion Depth Limit = " + std::to_string(depthLimit) + ", Base Threshold = " + std::to_string(config.insertionThreshold) + ".");
    }
    introSortUtil(arr, 0, n - 1, depthLimit, config, telemetry, 0);
    if (config.enableSplitsLog) {
        telemetry.logs.push_back("[SYSTEM] Introsort sorted " + std::to_string(n) + " elements. Comparisons: " + std::to_string(telemetry.comparisons) + ", Swaps: " + std::to_string(telemetry.swaps) + ", Max Stack Depth: " + std::to_string(telemetry.maxDepth) + ".");
    }
}

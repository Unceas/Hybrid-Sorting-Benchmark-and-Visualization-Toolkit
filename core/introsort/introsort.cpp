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
            insertionSort(arr, low, high, telemetry);
            return;
        }

        if (depthLimit == 0) {
            heapSortRange(arr, low, high, telemetry);
            return;
        }

        int p = partition(arr, low, high, config.pivotStrategy, telemetry);

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
    introSortUtil(arr, 0, n - 1, depthLimit, config, telemetry, 0);
    // Estimated stack frames (each takes approx 64 bytes)
    telemetry.memoryUsageBytes = telemetry.maxDepth * 64;
}

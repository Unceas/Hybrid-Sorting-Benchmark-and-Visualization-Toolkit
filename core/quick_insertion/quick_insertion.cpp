#include "quick_insertion.h"
#include <algorithm>

void quickInsertionUtil(std::vector<int>& arr, int low, int high, const SortConfig& config, SortTelemetry& telemetry, int depth) {
    if (depth > telemetry.maxDepth) {
        telemetry.maxDepth = depth;
    }
    while (low < high) {
        int size = high - low + 1;
        if (size < config.insertionThreshold) {
            insertionSort(arr, low, high, telemetry);
            return;
        }

        int p = partition(arr, low, high, config.pivotStrategy, telemetry);

        int leftSize = p - low;
        int rightSize = high - p;
        double balance = static_cast<double>(std::min(leftSize, rightSize)) / std::max(1, size);
        telemetry.totalPartitionBalance += balance;
        telemetry.partitionCount++;

        if (leftSize < rightSize) {
            quickInsertionUtil(arr, low, p - 1, config, telemetry, depth + 1);
            low = p + 1;
        } else {
            quickInsertionUtil(arr, p + 1, high, config, telemetry, depth + 1);
            high = p - 1;
        }
    }
}

void quickInsertionSort(std::vector<int>& arr, const SortConfig& config, SortTelemetry& telemetry) {
    if (arr.empty()) return;
    int n = static_cast<int>(arr.size());
    quickInsertionUtil(arr, 0, n - 1, config, telemetry, 0);
    telemetry.memoryUsageBytes = telemetry.maxDepth * 64;
}

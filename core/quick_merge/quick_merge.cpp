#include "quick_merge.h"
#include <algorithm>

namespace {
    void merge(std::vector<int>& arr, std::vector<int>& aux, int low, int mid, int high, SortTelemetry& telemetry) {
        for (int k = low; k <= high; ++k) {
            aux[k] = arr[k];
        }

        int i = low, j = mid + 1;
        for (int k = low; k <= high; ++k) {
            if (i > mid) {
                arr[k] = aux[j++];
                telemetry.swaps++;
            } else if (j > high) {
                arr[k] = aux[i++];
                telemetry.swaps++;
            } else {
                telemetry.comparisons++;
                if (aux[i] <= aux[j]) {
                    arr[k] = aux[i++];
                    telemetry.swaps++;
                } else {
                    arr[k] = aux[j++];
                    telemetry.swaps++;
                }
            }
        }
    }

    void mergeSortRange(std::vector<int>& arr, std::vector<int>& aux, int low, int high, SortTelemetry& telemetry) {
        if (low >= high) return;
        int mid = low + (high - low) / 2;
        mergeSortRange(arr, aux, low, mid, telemetry);
        mergeSortRange(arr, aux, mid + 1, high, telemetry);
        merge(arr, aux, low, mid, high, telemetry);
    }

    void quickMergeUtil(std::vector<int>& arr, std::vector<int>& aux, int low, int high, const SortConfig& config, SortTelemetry& telemetry, int depth) {
        if (depth > telemetry.maxDepth) {
            telemetry.maxDepth = depth;
        }
        while (low < high) {
            int size = high - low + 1;
            if (size < config.insertionThreshold) {
                mergeSortRange(arr, aux, low, high, telemetry);
                return;
            }

            int p = partition(arr, low, high, config.pivotStrategy, telemetry);

            int leftSize = p - low;
            int rightSize = high - p;
            double balance = static_cast<double>(std::min(leftSize, rightSize)) / std::max(1, size);
            telemetry.totalPartitionBalance += balance;
            telemetry.partitionCount++;

            if (leftSize < rightSize) {
                quickMergeUtil(arr, aux, low, p - 1, config, telemetry, depth + 1);
                low = p + 1;
            } else {
                quickMergeUtil(arr, aux, p + 1, high, config, telemetry, depth + 1);
                high = p - 1;
            }
        }
    }
}

void quickMergeSort(std::vector<int>& arr, const SortConfig& config, SortTelemetry& telemetry) {
    if (arr.empty()) return;
    int n = static_cast<int>(arr.size());
    std::vector<int> aux(n);
    quickMergeUtil(arr, aux, 0, n - 1, config, telemetry, 0);
    telemetry.memoryUsageBytes = (telemetry.maxDepth * 64) + (n * sizeof(int));
}

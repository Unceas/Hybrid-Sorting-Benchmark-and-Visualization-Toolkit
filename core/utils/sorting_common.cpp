#include "sorting_common.h"
#include <algorithm>
#include <random>
#include <cmath>

int selectPivotIndex(std::vector<int>& arr, int low, int high, PivotStrategy strategy, SortTelemetry& telemetry) {
    if (strategy == PivotStrategy::FIRST) {
        return low;
    } else if (strategy == PivotStrategy::RANDOM) {
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<int> dist(low, high);
        return dist(gen);
    } else if (strategy == PivotStrategy::MEDIAN_OF_THREE) {
        int mid = low + (high - low) / 2;
        int a = arr[low];
        int b = arr[mid];
        int c = arr[high];
        telemetry.comparisons += 3;
        if ((a <= b && b <= c) || (c <= b && b <= a)) return mid;
        if ((b <= a && a <= c) || (c <= a && a <= b)) return low;
        return high;
    }
    return high;
}

int partition(std::vector<int>& arr, int low, int high, PivotStrategy strategy, SortTelemetry& telemetry) {
    int pivotIdx = selectPivotIndex(arr, low, high, strategy, telemetry);
    if (pivotIdx != high) {
        std::swap(arr[pivotIdx], arr[high]);
        telemetry.swaps++;
    }
    int pivot = arr[high];
    int i = low - 1;

    for (int j = low; j < high; ++j) {
        telemetry.comparisons++;
        if (arr[j] <= pivot) {
            ++i;
            if (i != j) {
                std::swap(arr[i], arr[j]);
                telemetry.swaps++;
            }
        }
    }
    std::swap(arr[i + 1], arr[high]);
    telemetry.swaps++;
    return i + 1;
}

void insertionSort(std::vector<int>& arr, int low, int high, SortTelemetry& telemetry) {
    telemetry.insertionSortTriggers++;
    for (int i = low + 1; i <= high; ++i) {
        int key = arr[i];
        int j = i - 1;
        while (j >= low) {
            telemetry.comparisons++;
            if (arr[j] > key) {
                arr[j + 1] = arr[j];
                telemetry.swaps++;
                --j;
            } else {
                break;
            }
        }
        arr[j + 1] = key;
    }
}

void heapify(std::vector<int>& arr, int low, int size, int root, SortTelemetry& telemetry) {
    int largest = root;
    int left = 2 * root + 1;
    int right = 2 * root + 2;

    if (left < size) {
        telemetry.comparisons++;
        if (arr[low + left] > arr[low + largest]) {
            largest = left;
        }
    }
    if (right < size) {
        telemetry.comparisons++;
        if (arr[low + right] > arr[low + largest]) {
            largest = right;
        }
    }

    if (largest != root) {
        std::swap(arr[low + root], arr[low + largest]);
        telemetry.swaps++;
        heapify(arr, low, size, largest, telemetry);
    }
}

void heapSortRange(std::vector<int>& arr, int low, int high, SortTelemetry& telemetry) {
    telemetry.heapSortFallbacks++;
    int size = high - low + 1;
    for (int i = size / 2 - 1; i >= 0; --i) {
        heapify(arr, low, size, i, telemetry);
    }
    for (int i = size - 1; i > 0; --i) {
        std::swap(arr[low], arr[low + i]);
        telemetry.swaps++;
        heapify(arr, low, i, 0, telemetry);
    }
}

// Helper functions for merge-based inversion counting
long long mergeAndMerge(std::vector<int>& arr, std::vector<int>& temp, int left, int mid, int right) {
    int i = left;
    int j = mid + 1;
    int k = left;
    long long invCount = 0;
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) {
            temp[k++] = arr[i++];
        } else {
            temp[k++] = arr[j++];
            invCount += (mid - i + 1);
        }
    }
    while (i <= mid) {
        temp[k++] = arr[i++];
    }
    while (j <= right) {
        temp[k++] = arr[j++];
    }
    for (i = left; i <= right; i++) {
        arr[i] = temp[i];
    }
    return invCount;
}

long long mergeAndCount(std::vector<int>& arr, std::vector<int>& temp, int left, int right) {
    long long invCount = 0;
    if (left < right) {
        int mid = left + (right - left) / 2;
        invCount += mergeAndCount(arr, temp, left, mid);
        invCount += mergeAndCount(arr, temp, mid + 1, right);
        invCount += mergeAndMerge(arr, temp, left, mid, right);
    }
    return invCount;
}

DatasetMetrics analyzeDataset(const std::vector<int>& arr) {
    DatasetMetrics metrics;
    int n = static_cast<int>(arr.size());
    if (n <= 1) {
        metrics.sortedness = 1.0;
        metrics.duplicateRatio = 0.0;
        metrics.inversionCount = 0;
        metrics.distributionType = "nearly_sorted";
        metrics.recommendedHybrid = "quick_insertion";
        metrics.recommendationReason = "Array size is too small to benefit from partition splitting. Small constant insertion sorts are optimal.";
        return metrics;
    }

    // 1. Calculate Sortedness (ratio of sorted adjacent pairs)
    int sortedPairs = 0;
    for (int i = 0; i < n - 1; ++i) {
        if (arr[i] <= arr[i + 1]) {
            sortedPairs++;
        }
    }
    metrics.sortedness = static_cast<double>(sortedPairs) / (n - 1);

    // 2. Count Inversions (using a copy of array to keep it O(N log N))
    std::vector<int> tempInv = arr;
    std::vector<int> tempBuffer(n);
    metrics.inversionCount = mergeAndCount(tempInv, tempBuffer, 0, n - 1);

    // 3. Count Unique Elements to find Duplicate Ratio
    // Since tempInv is now fully sorted after mergeAndCount, we can find unique count directly
    auto uniqueEnd = std::unique(tempInv.begin(), tempInv.end());
    int uniqueCount = std::distance(tempInv.begin(), uniqueEnd);
    metrics.duplicateRatio = 1.0 - (static_cast<double>(uniqueCount) / n);

    // 4. Determine Distribution Type and Recommendations
    if (metrics.sortedness >= 0.95) {
        metrics.distributionType = "nearly_sorted";
        metrics.recommendedHybrid = "quick_insertion";
        metrics.recommendationReason = "High presortedness sequence detected. Quick+Insertion minimizes partitioning passes and leverages O(N) insertion behavior.";
    } else if (metrics.sortedness <= 0.05) {
        metrics.distributionType = "reverse_sorted";
        metrics.recommendedHybrid = "introsort";
        metrics.recommendationReason = "Highly reversed sequence detected. Introsort safeguards against potential worst-case quadratic recursion depth.";
    } else if (metrics.duplicateRatio >= 0.25) {
        metrics.distributionType = "duplicate_heavy";
        metrics.recommendedHybrid = "quick_merge";
        metrics.recommendationReason = "Dense duplicate value concentration detected. Stable Merge base-case routines bound comparisons and write complexities on equal keys.";
    } else {
        metrics.distributionType = "random";
        metrics.recommendedHybrid = "introsort";
        metrics.recommendationReason = "Uniform random distribution model. Introsort provides optimal average runtime cycles with fallback guarantees.";
    }

    return metrics;
}

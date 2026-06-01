#include "sorting_common.h"
#include <algorithm>
#include <random>

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
        telemetry.comparisons += 3; // 3 comparisons to find median of three
        if ((a <= b && b <= c) || (c <= b && b <= a)) return mid;
        if ((b <= a && a <= c) || (c <= a && a <= b)) return low;
        return high;
    }
    // Default is LAST
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

void analyzeDataset(const std::vector<int>& arr, SortTelemetry& telemetry) {
    int n = arr.size();
    if (n <= 1) {
        telemetry.sortedness = 1.0;
        telemetry.duplicateDensity = 0.0;
        telemetry.skewness = 0.0;
        telemetry.recommendedProfile = "balanced";
        telemetry.recommendationReason = "Dataset size too small for profiling. Defaulting to Balanced preset.";
        return;
    }

    // 1. Sortedness
    int sortedPairs = 0;
    for (int i = 0; i < n - 1; ++i) {
        if (arr[i] <= arr[i + 1]) {
            sortedPairs++;
        }
    }
    telemetry.sortedness = (double)sortedPairs / (n - 1);

    // 2. Duplicate Density & Skewness via sorted copy
    std::vector<int> temp = arr;
    std::sort(temp.begin(), temp.end());

    auto uniqueEnd = std::unique(temp.begin(), temp.end());
    int uniqueCount = std::distance(temp.begin(), uniqueEnd);
    telemetry.duplicateDensity = 1.0 - ((double)uniqueCount / n);

    double sum = 0.0;
    for (int val : arr) sum += val;
    double mean = sum / n;
    double median = temp[n / 2];

    double variance = 0.0;
    for (int val : arr) {
        variance += (val - mean) * (val - mean);
    }
    variance /= n;
    double stdDev = std::sqrt(variance);

    telemetry.skewness = (stdDev > 1e-6) ? (mean - median) / stdDev : 0.0;

    // 3. Adaptive Engine Decision Logic
    if (telemetry.sortedness > 0.90) {
        telemetry.recommendedProfile = "balanced";
        telemetry.recommendationReason = "High pre-sorted structure detected (sortedness: " 
            + std::to_string(static_cast<int>(telemetry.sortedness * 100)) 
            + "%). Balanced switching avoids unnecessary partition splits.";
    } else if (telemetry.duplicateDensity > 0.35) {
        telemetry.recommendedProfile = "memory_optimized";
        telemetry.recommendationReason = "High duplicate concentration detected (duplicate ratio: " 
            + std::to_string(static_cast<int>(telemetry.duplicateDensity * 100)) 
            + "%). Memory optimized switching bounds recursion recursion stack space.";
    } else if (n >= 25000) {
        telemetry.recommendedProfile = "large_dataset_optimized";
        telemetry.recommendationReason = "Large dataset size (N=" + std::to_string(n) 
            + "). Larger threshold offsets deep quicksort calls on main segments.";
    } else {
        telemetry.recommendedProfile = "low_latency";
        telemetry.recommendationReason = "Standard uniform random profile. Low Latency parameters minimize total execution cycles.";
    }
}


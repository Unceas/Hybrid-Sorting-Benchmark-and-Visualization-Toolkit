#ifndef SORTING_COMMON_H
#define SORTING_COMMON_H

#include <vector>
#include <string>

enum class PivotStrategy {
    LAST,
    FIRST,
    MEDIAN_OF_THREE,
    RANDOM
};

inline std::string pivotStrategyToString(PivotStrategy strategy) {
    switch (strategy) {
        case PivotStrategy::FIRST: return "first";
        case PivotStrategy::MEDIAN_OF_THREE: return "median_of_three";
        case PivotStrategy::RANDOM: return "random";
        default: return "last";
    }
}

inline PivotStrategy stringToPivotStrategy(const std::string& str) {
    if (str == "first") return PivotStrategy::FIRST;
    if (str == "median_of_three") return PivotStrategy::MEDIAN_OF_THREE;
    if (str == "random") return PivotStrategy::RANDOM;
    return PivotStrategy::LAST;
}

struct SortTelemetry {
    long long comparisons = 0;
    long long swaps = 0;
    int maxDepth = 0;
    int currentDepth = 0;
    int insertionSortTriggers = 0;
    int heapSortFallbacks = 0;
    double totalPartitionBalance = 0.0;
    int partitionCount = 0;
    long long memoryUsageBytes = 0; // Auxiliary memory usage in bytes
};

struct SortConfig {
    int insertionThreshold = 16;
    PivotStrategy pivotStrategy = PivotStrategy::MEDIAN_OF_THREE;
    int seed = 42;
};

struct DatasetMetrics {
    double sortedness = 0.0;
    double duplicateRatio = 0.0;
    long long inversionCount = 0;
    std::string distributionType = "unknown";
    std::string recommendedHybrid = "introsort";
    std::string recommendationReason = "";
};

// Common helper declarations
int selectPivotIndex(std::vector<int>& arr, int low, int high, PivotStrategy strategy, SortTelemetry& telemetry);
int partition(std::vector<int>& arr, int low, int high, PivotStrategy strategy, SortTelemetry& telemetry);
void insertionSort(std::vector<int>& arr, int low, int high, SortTelemetry& telemetry);
void heapify(std::vector<int>& arr, int low, int size, int root, SortTelemetry& telemetry);
void heapSortRange(std::vector<int>& arr, int low, int high, SortTelemetry& telemetry);

DatasetMetrics analyzeDataset(const std::vector<int>& arr);

#endif // SORTING_COMMON_H

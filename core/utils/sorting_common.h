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

enum class SortProfile {
    BALANCED,
    LOW_LATENCY,
    MEMORY_OPTIMIZED,
    LARGE_DATASET_OPTIMIZED,
    CUSTOM
};

inline std::string profileToString(SortProfile profile) {
    switch (profile) {
        case SortProfile::BALANCED: return "balanced";
        case SortProfile::LOW_LATENCY: return "low_latency";
        case SortProfile::MEMORY_OPTIMIZED: return "memory_optimized";
        case SortProfile::LARGE_DATASET_OPTIMIZED: return "large_dataset_optimized";
        default: return "custom";
    }
}

inline SortProfile stringToProfile(const std::string& str) {
    if (str == "balanced") return SortProfile::BALANCED;
    if (str == "low_latency") return SortProfile::LOW_LATENCY;
    if (str == "memory_optimized") return SortProfile::MEMORY_OPTIMIZED;
    if (str == "large_dataset_optimized") return SortProfile::LARGE_DATASET_OPTIMIZED;
    return SortProfile::CUSTOM;
}

struct SplitInfo {
    int low;
    int high;
    int pivotIndex;
    int depth;
};

struct SortTelemetry {
    long long comparisons = 0;
    long long swaps = 0;
    int maxDepth = 0;
    int currentDepth = 0;
    int insertionSortTriggers = 0;
    int heapSortFallbacks = 0;
    double totalPartitionBalance = 0.0;
    int partitionCount = 0;
    std::vector<SplitInfo> splits;
    std::vector<std::string> logs;
    
    // Dataset Analytics
    double sortedness = 0.0;
    double duplicateDensity = 0.0;
    double skewness = 0.0;
    std::string recommendedProfile = "";
    std::string recommendationReason = "";
};

struct SortConfig {
    int insertionThreshold = 16;
    PivotStrategy pivotStrategy = PivotStrategy::MEDIAN_OF_THREE;
    bool enableSplitsLog = false;
    int seed = 42;
    SortProfile profile = SortProfile::CUSTOM;

    void applyProfile() {
        if (profile == SortProfile::BALANCED) {
            insertionThreshold = 16;
            pivotStrategy = PivotStrategy::MEDIAN_OF_THREE;
        } else if (profile == SortProfile::LOW_LATENCY) {
            insertionThreshold = 32;
            pivotStrategy = PivotStrategy::MEDIAN_OF_THREE;
        } else if (profile == SortProfile::MEMORY_OPTIMIZED) {
            insertionThreshold = 8;
            pivotStrategy = PivotStrategy::MEDIAN_OF_THREE;
        } else if (profile == SortProfile::LARGE_DATASET_OPTIMIZED) {
            insertionThreshold = 24;
            pivotStrategy = PivotStrategy::MEDIAN_OF_THREE;
        }
    }
};

// Common helper declarations
void analyzeDataset(const std::vector<int>& arr, SortTelemetry& telemetry);
int selectPivotIndex(std::vector<int>& arr, int low, int high, PivotStrategy strategy, SortTelemetry& telemetry);
int partition(std::vector<int>& arr, int low, int high, PivotStrategy strategy, SortTelemetry& telemetry);
void insertionSort(std::vector<int>& arr, int low, int high, SortTelemetry& telemetry);
void heapify(std::vector<int>& arr, int low, int size, int root, SortTelemetry& telemetry);
void heapSortRange(std::vector<int>& arr, int low, int high, SortTelemetry& telemetry);

#endif // SORTING_COMMON_H

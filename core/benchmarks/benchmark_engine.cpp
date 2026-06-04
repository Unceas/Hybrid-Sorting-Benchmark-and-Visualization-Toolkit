#include <iostream>
#include <string>
#include <vector>
#include <chrono>
#include <fstream>
#include <algorithm>
#include <cmath>
#include <iomanip>
#include "../utils/sorting_common.h"
#include "../introsort/introsort.h"
#include "../quick_insertion/quick_insertion.h"
#include "../quick_merge/quick_merge.h"
#include "../quick_heap/quick_heap.h"
#include "../datasets/dataset_generator.h"

struct BenchmarkResult {
    std::string algorithm;
    std::string dataset;
    int size;
    int threshold;
    std::string pivotStrategy;
    int runs;
    double avgTimeMs;
    long long comparisons;
    long long swaps;
    int maxDepth;
    int insertionSortTriggers;
    int heapSortFallbacks;
    double partitionBalance;
    long long memoryUsageBytes;
    int seed;
    DatasetMetrics metrics;
};

void runSingleBenchmark(const std::string& algo, const std::string& datasetType, int size, int threshold, PivotStrategy pivot, int runs, int seed, BenchmarkResult& result) {
    SortConfig config;
    config.insertionThreshold = threshold;
    config.pivotStrategy = pivot;
    config.seed = seed;

    std::vector<int> baseArray = generateDataset(datasetType, size, seed);
    
    // Execute dataset analysis on the pre-sorted array
    result.metrics = analyzeDataset(baseArray);

    double totalTimeMs = 0.0;
    SortTelemetry firstRunTelemetry;

    for (int r = 0; r < runs; ++r) {
        std::vector<int> arr = baseArray;
        SortTelemetry telemetry;

        auto start = std::chrono::high_resolution_clock::now();
        if (algo == "introsort") {
            introSort(arr, config, telemetry);
        } else if (algo == "quick_insertion") {
            quickInsertionSort(arr, config, telemetry);
        } else if (algo == "quick_merge") {
            quickMergeSort(arr, config, telemetry);
        } else if (algo == "quick_heap") {
            quickHeapSort(arr, config, telemetry);
        }
        auto end = std::chrono::high_resolution_clock::now();

        if (!std::is_sorted(arr.begin(), arr.end())) {
            std::cerr << "CRITICAL ERROR: Algorithm " << algo << " failed to sort correctly!\n";
        }

        double timeMs = std::chrono::duration<double, std::milli>(end - start).count();
        totalTimeMs += timeMs;

        if (r == 0) {
            firstRunTelemetry = telemetry;
        }
    }

    result.algorithm = algo;
    result.dataset = datasetType;
    result.size = size;
    result.threshold = config.insertionThreshold;
    result.pivotStrategy = pivotStrategyToString(config.pivotStrategy);
    result.runs = runs;
    result.avgTimeMs = totalTimeMs / runs;
    result.comparisons = firstRunTelemetry.comparisons;
    result.swaps = firstRunTelemetry.swaps;
    result.maxDepth = firstRunTelemetry.maxDepth;
    result.insertionSortTriggers = firstRunTelemetry.insertionSortTriggers;
    result.heapSortFallbacks = firstRunTelemetry.heapSortFallbacks;
    result.partitionBalance = firstRunTelemetry.partitionCount > 0 
        ? firstRunTelemetry.totalPartitionBalance / firstRunTelemetry.partitionCount 
        : 0.5;
    result.memoryUsageBytes = firstRunTelemetry.memoryUsageBytes;
    result.seed = seed;
}

std::string escapeJson(const std::string& str) {
    std::string res = "\"";
    for (char c : str) {
        if (c == '"') res += "\\\"";
        else if (c == '\\') res += "\\\\";
        else if (c == '\n') res += "\\n";
        else res += c;
    }
    res += "\"";
    return res;
}

void printJson(const std::vector<BenchmarkResult>& results, std::ostream& out) {
    out << "[\n";
    for (size_t i = 0; i < results.size(); ++i) {
        const auto& r = results[i];
        out << "  {\n";
        out << "    \"algorithm\": " << escapeJson(r.algorithm) << ",\n";
        out << "    \"dataset\": " << escapeJson(r.dataset) << ",\n";
        out << "    \"size\": " << r.size << ",\n";
        out << "    \"threshold\": " << r.threshold << ",\n";
        out << "    \"pivot_strategy\": " << escapeJson(r.pivotStrategy) << ",\n";
        out << "    \"runs\": " << r.runs << ",\n";
        out << "    \"execution_time_ms\": " << std::fixed << std::setprecision(4) << r.avgTimeMs << ",\n";
        out << "    \"comparisons\": " << r.comparisons << ",\n";
        out << "    \"swaps\": " << r.swaps << ",\n";
        out << "    \"max_depth\": " << r.maxDepth << ",\n";
        out << "    \"insertion_sort_triggers\": " << r.insertionSortTriggers << ",\n";
        out << "    \"heapsort_fallbacks\": " << r.heapSortFallbacks << ",\n";
        out << "    \"partition_balance\": " << std::fixed << std::setprecision(4) << r.partitionBalance << ",\n";
        out << "    \"memory_usage_bytes\": " << r.memoryUsageBytes << ",\n";
        out << "    \"seed\": " << r.seed << ",\n";
        
        // Dataset metrics nested JSON
        out << "    \"dataset_metrics\": {\n";
        out << "      \"sortedness\": " << std::fixed << std::setprecision(4) << r.metrics.sortedness << ",\n";
        out << "      \"duplicate_ratio\": " << std::fixed << std::setprecision(4) << r.metrics.duplicateRatio << ",\n";
        out << "      \"inversion_count\": " << r.metrics.inversionCount << ",\n";
        out << "      \"distribution_type\": " << escapeJson(r.metrics.distributionType) << ",\n";
        out << "      \"recommended_hybrid\": " << escapeJson(r.metrics.recommendedHybrid) << ",\n";
        out << "      \"recommendation_reason\": " << escapeJson(r.metrics.recommendationReason) << "\n";
        out << "    }\n";
        
        out << "  }";
        if (i + 1 < results.size()) out << ",";
        out << "\n";
    }
    out << "]\n";
}

void printCsv(const std::vector<BenchmarkResult>& results, std::ostream& out) {
    out << "algorithm,dataset,size,threshold,pivot_strategy,runs,execution_time_ms,comparisons,swaps,max_depth,insertion_sort_triggers,heapsort_fallbacks,partition_balance,memory_usage_bytes,seed,sortedness,duplicate_ratio,inversion_count,distribution_type,recommended_hybrid\n";
    for (const auto& r : results) {
        out << r.algorithm << ","
            << r.dataset << ","
            << r.size << ","
            << r.threshold << ","
            << r.pivotStrategy << ","
            << r.runs << ","
            << std::fixed << std::setprecision(4) << r.avgTimeMs << ","
            << r.comparisons << ","
            << r.swaps << ","
            << r.maxDepth << ","
            << r.insertionSortTriggers << ","
            << r.heapSortFallbacks << ","
            << std::fixed << std::setprecision(4) << r.partitionBalance << ","
            << r.memoryUsageBytes << ","
            << r.seed << ","
            << std::fixed << std::setprecision(4) << r.metrics.sortedness << ","
            << std::fixed << std::setprecision(4) << r.metrics.duplicateRatio << ","
            << r.metrics.inversionCount << ","
            << r.metrics.distributionType << ","
            << r.metrics.recommendedHybrid << "\n";
    }
}

int main(int argc, char* argv[]) {
    std::string algo = "introsort";
    std::string dataset = "random";
    int size = 10000;
    int threshold = 16;
    PivotStrategy pivot = PivotStrategy::MEDIAN_OF_THREE;
    int runs = 5;
    std::string format = "json";
    std::string outputPath = "";
    int seed = 42;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--algo" && i + 1 < argc) {
            algo = argv[++i];
        } else if (arg == "--size" && i + 1 < argc) {
            size = std::stoi(argv[++i]);
        } else if (arg == "--dataset" && i + 1 < argc) {
            dataset = argv[++i];
        } else if (arg == "--threshold" && i + 1 < argc) {
            threshold = std::stoi(argv[++i]);
        } else if (arg == "--pivot" && i + 1 < argc) {
            pivot = stringToPivotStrategy(argv[++i]);
        } else if (arg == "--runs" && i + 1 < argc) {
            runs = std::stoi(argv[++i]);
        } else if (arg == "--format" && i + 1 < argc) {
            format = argv[++i];
        } else if (arg == "--output" && i + 1 < argc) {
            outputPath = argv[++i];
        } else if (arg == "--seed" && i + 1 < argc) {
            seed = std::stoi(argv[++i]);
        }
    }

    std::vector<std::string> algosToRun;
    if (algo == "all") {
        algosToRun = {"introsort", "quick_insertion", "quick_merge", "quick_heap"};
    } else {
        algosToRun = {algo};
    }

    std::vector<BenchmarkResult> results;
    for (const auto& a : algosToRun) {
        BenchmarkResult r;
        runSingleBenchmark(a, dataset, size, threshold, pivot, runs, seed, r);
        results.push_back(r);
    }

    if (!outputPath.empty()) {
        std::ofstream outFile(outputPath);
        if (!outFile.is_open()) {
            std::cerr << "Failed to open output file: " << outputPath << "\n";
            return 1;
        }
        if (format == "csv") {
            printCsv(results, outFile);
        } else {
            printJson(results, outFile);
        }
        outFile.close();
    } else {
        if (format == "csv") {
            printCsv(results, std::cout);
        } else {
            printJson(results, std::cout);
        }
    }

    return 0;
}

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
    std::vector<SplitInfo> splits;
    std::vector<std::string> logs;
    int seed;
    std::string profile;
    double sortedness;
    double duplicateDensity;
    double skewness;
    std::string recommendedProfile;
    std::string recommendationReason;
};

void runSingleBenchmark(const std::string& algo, const std::string& datasetType, int size, int threshold, PivotStrategy pivot, int runs, bool enableSplits, int seed, SortProfile profile, BenchmarkResult& result) {
    SortConfig config;
    config.insertionThreshold = threshold;
    config.pivotStrategy = pivot;
    config.enableSplitsLog = enableSplits;
    config.seed = seed;
    config.profile = profile;
    config.applyProfile();

    std::vector<int> baseArray = generateDataset(datasetType, size, seed);
    double totalTimeMs = 0.0;

    SortTelemetry firstRunTelemetry;
    analyzeDataset(baseArray, firstRunTelemetry);

    for (int r = 0; r < runs; ++r) {
        std::vector<int> arr = baseArray;
        SortTelemetry telemetry;
        telemetry.sortedness = firstRunTelemetry.sortedness;
        telemetry.duplicateDensity = firstRunTelemetry.duplicateDensity;
        telemetry.skewness = firstRunTelemetry.skewness;
        telemetry.recommendedProfile = firstRunTelemetry.recommendedProfile;
        telemetry.recommendationReason = firstRunTelemetry.recommendationReason;

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
    result.splits = firstRunTelemetry.splits;
    result.logs = firstRunTelemetry.logs;
    result.seed = seed;
    result.profile = profileToString(profile);
    result.sortedness = firstRunTelemetry.sortedness;
    result.duplicateDensity = firstRunTelemetry.duplicateDensity;
    result.skewness = firstRunTelemetry.skewness;
    result.recommendedProfile = firstRunTelemetry.recommendedProfile;
    result.recommendationReason = firstRunTelemetry.recommendationReason;
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
        out << "    \"seed\": " << r.seed << ",\n";
        out << "    \"profile\": " << escapeJson(r.profile) << ",\n";
        out << "    \"sortedness\": " << std::fixed << std::setprecision(4) << r.sortedness << ",\n";
        out << "    \"duplicate_density\": " << std::fixed << std::setprecision(4) << r.duplicateDensity << ",\n";
        out << "    \"skewness\": " << std::fixed << std::setprecision(4) << r.skewness << ",\n";
        out << "    \"recommended_profile\": " << escapeJson(r.recommendedProfile) << ",\n";
        out << "    \"recommendation_reason\": " << escapeJson(r.recommendationReason) << ",\n";
        
        // Logs serialization
        out << "    \"logs\": [\n";
        for (size_t l = 0; l < r.logs.size(); ++l) {
            out << "      " << escapeJson(r.logs[l]);
            if (l + 1 < r.logs.size()) out << ",";
            out << "\n";
        }
        out << "    ],\n";

        // Splits serialization
        out << "    \"splits\": [\n";
        for (size_t s = 0; s < r.splits.size(); ++s) {
            const auto& split = r.splits[s];
            out << "      {\"low\": " << split.low << ", \"high\": " << split.high 
                << ", \"pivot_index\": " << split.pivotIndex << ", \"depth\": " << split.depth << "}";
            if (s + 1 < r.splits.size()) out << ",";
            out << "\n";
        }
        out << "    ]\n";
        out << "  }";
        if (i + 1 < results.size()) out << ",";
        out << "\n";
    }
    out << "]\n";
}

void printCsv(const std::vector<BenchmarkResult>& results, std::ostream& out) {
    out << "algorithm,dataset,size,threshold,pivot_strategy,runs,execution_time_ms,comparisons,swaps,max_depth,insertion_sort_triggers,heapsort_fallbacks,partition_balance,seed,profile,sortedness,duplicate_density,skewness\n";
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
            << r.seed << ","
            << r.profile << ","
            << std::fixed << std::setprecision(4) << r.sortedness << ","
            << std::fixed << std::setprecision(4) << r.duplicateDensity << ","
            << std::fixed << std::setprecision(4) << r.skewness << "\n";
    }
}

int main(int argc, char* argv[]) {
    std::string algo = "introsort";
    std::string dataset = "random";
    int size = 10000;
    int threshold = 16;
    PivotStrategy pivot = PivotStrategy::MEDIAN_OF_THREE;
    int runs = 5;
    bool enableSplits = false;
    std::string format = "json";
    std::string outputPath = "";
    int seed = 42;
    SortProfile profile = SortProfile::CUSTOM;

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
        } else if (arg == "--enable-splits") {
            enableSplits = true;
        } else if (arg == "--format" && i + 1 < argc) {
            format = argv[++i];
        } else if (arg == "--output" && i + 1 < argc) {
            outputPath = argv[++i];
        } else if (arg == "--seed" && i + 1 < argc) {
            seed = std::stoi(argv[++i]);
        } else if (arg == "--profile" && i + 1 < argc) {
            profile = stringToProfile(argv[++i]);
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
        runSingleBenchmark(a, dataset, size, threshold, pivot, runs, enableSplits, seed, profile, r);
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

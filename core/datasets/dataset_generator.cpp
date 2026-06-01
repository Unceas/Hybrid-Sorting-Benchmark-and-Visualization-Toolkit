#include "dataset_generator.h"
#include <random>
#include <algorithm>
#include <cmath>

std::vector<int> generateDataset(const std::string& type, int size, int seed) {
    std::vector<int> arr(size);
    std::mt19937 gen(seed);

    if (type == "random") {
        std::uniform_int_distribution<int> dist(0, 1000000);
        for (int i = 0; i < size; ++i) {
            arr[i] = dist(gen);
        }
    } else if (type == "nearly_sorted") {
        for (int i = 0; i < size; ++i) {
            arr[i] = i;
        }
        std::uniform_int_distribution<int> dist(0, size - 1);
        int swaps = std::max(1, size / 10);
        for (int i = 0; i < swaps; ++i) {
            std::swap(arr[dist(gen)], arr[dist(gen)]);
        }
    } else if (type == "reverse_sorted") {
        for (int i = 0; i < size; ++i) {
            arr[i] = size - i;
        }
    } else if (type == "duplicate_heavy") {
        // limit values to a very narrow range so there are many duplicates
        std::uniform_int_distribution<int> dist(0, std::max(2, size / 100));
        for (int i = 0; i < size; ++i) {
            arr[i] = dist(gen);
        }
    } else if (type == "skewed") {
        // Skewed using exponential distribution
        std::exponential_distribution<double> dist(0.0001);
        for (int i = 0; i < size; ++i) {
            arr[i] = static_cast<int>(dist(gen));
        }
    } else {
        // Default to random
        std::uniform_int_distribution<int> dist(0, 1000000);
        for (int i = 0; i < size; ++i) {
            arr[i] = dist(gen);
        }
    }
    return arr;
}

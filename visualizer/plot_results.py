import pandas as pd
import matplotlib.pyplot as plt
import os

csv_path = "../results/reports/benchmark_results.csv"
if not os.path.exists(csv_path):
    csv_path = "../benchmark_results.csv" # fallback

if os.path.exists(csv_path):
    df = pd.read_csv(csv_path)

    plt.figure(figsize=(8,5))

    plt.plot(df["size"], df["quickInsertion"], label="Quick + Insertion")
    plt.plot(df["size"], df["quickMerge"], label="Quick + Merge")
    plt.plot(df["size"], df["quickHeap"], label="Quick + Heap")
    plt.plot(df["size"], df["introsort"], label="IntroSort")

    plt.xlabel("Dataset Size")
    plt.ylabel("Time (ns)")
    plt.title("Hybrid Sorting Algorithm Performance")
    plt.legend()
    plt.grid(True)

    plt.savefig("benchmark_graph.png")
    plt.show()
else:
    print(f"Error: Could not locate benchmark results CSV file at {csv_path}")

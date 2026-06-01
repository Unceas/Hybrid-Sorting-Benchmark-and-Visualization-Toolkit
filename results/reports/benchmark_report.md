# 📈 Adaptive Execution & Performance Report

Generated: 2026-06-01T15:00:31.810838 UTC  
Experiment Seeding: `--seed 42`  
Dataset Profile: `random` (Size: 20,000)

---

## 🔍 Dataset Analytics & Decision Recommendation
* **Presortedness Score**: `0.5001` (1.0 = perfectly sorted)
* **Duplicate Value Ratio**: `0.0086` (0.0 = all unique values)
* **Distribution Skewness**: `-0.0198`
* **Recommended Switching Profile**: `LOW_LATENCY`
* **Decision Engine Rationale**: *"Standard uniform random profile. Low Latency parameters minimize total execution cycles."*

---

## ⚡ Algorithm Execution Profiling Summary

| Algorithm | Average Speed (ms) | Comparisons | Swaps / Writes | Max Stack Depth | Base Triggers | Fallbacks | Partition Balance |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Introsort** | 2.3060 | 430,331 | 310,095 | 7 | 517 | 0 | 0.3130 |
| **Quick + Insertion** | 2.1350 | 430,331 | 310,095 | 7 | 517 | 0 | 0.3130 |
| **Quick + Merge** | 3.3075 | 285,213 | 206,647 | 7 | 0 | 0 | 0.3130 |
| **Quick + Heap** | 3.3940 | 354,622 | 189,779 | 7 | 0 | 517 | 0.3130 |

---

## 📋 System Execution Log Excerpts
Below are the step-by-step partition analysis logs gathered from the execution kernel of the first profile run.
```txt
[Trace Recursion Splits was disabled for this run]
```

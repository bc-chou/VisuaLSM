---
title: Size-Tiered Compaction
---

## Overview

Size-Tiered Compaction Strategy (STCS) is the simplest approach to compaction in LSM Tree systems. It groups SSTables into "tiers" based on file size and triggers compaction when enough similarly-sized files accumulate.

The core principle is straightforward: when a certain number of SSTables of similar size accumulates, they are merged into a larger SSTable.


## How It Works

Size-Tiered Compaction follows these steps:

1. **Grouping**: SSTables are grouped into buckets based on size similarity
   - Typically using a size ratio (e.g., files within 2x size of each other)

2. **Triggering**: Compaction triggers when a bucket contains more than a threshold number of SSTables
   - Common threshold values range from 4 to 8 files

3. **Merging**: All SSTables in the triggering bucket are merged into a new, larger SSTable
   - The newest version of each key is kept
   - Tombstones are preserved unless they've exceeded their grace period

4. **Replacement**: The original SSTables are replaced with the newly created one

This process continues as SSTables grow in size, creating a tiered structure where larger SSTables contain older data.

## Performance Characteristics

### Strengths

- **Write Optimized**: Minimizes write amplification since each file participates in relatively few compactions
- **Simple Implementation**: Straightforward to reason about and implement
- **Low CPU Overhead**: Less computational overhead than more complex strategies
- **Efficient for Append-Only**: Works well for workloads that rarely update existing data

### Limitations

- **Read Amplification**: Reads may need to check multiple SSTables across different size tiers
- **Space Overhead**: Multiple versions of keys can exist across tiers
- **Tombstone Persistence**: Deleted data (tombstones) can persist for extended periods
- **Compaction Storms**: Large compactions can cause I/O spikes when many SSTables trigger simultaneously

## Use Cases

Size-Tiered Compaction is well-suited for:

- **Write-heavy workloads** with infrequent reads
- **Time-series data** where older data is rarely queried
- **Append-only workloads** with minimal updates to existing data
- **Systems with limited CPU resources** but adequate disk space

:::tip
Size-Tiered Compaction is often the default strategy in many LSM Tree implementations due to its simplicity and good write performance. It's particularly effective in the early stages of LSM Tree levels (e.g., L0-L1).
:::
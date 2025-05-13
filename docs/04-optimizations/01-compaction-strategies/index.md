---
title: Compaction Strategies
---

## Overview

Compaction is the process of merging multiple SSTables to organize data, eliminate duplicate entries, and purge tombstones. The choice of compaction strategy fundamentally shapes the performance profile of an LSM Tree-based system.

Different compaction strategies offer various trade-offs between:
- Read performance
- Write throughput
- Space efficiency
- Resource utilization

## Core Compaction Strategies

This section covers the main compaction strategies used in production LSM Tree-based systems:

1. **Size-Tiered Compaction**: Merges SSTables of similar sizes when a threshold number accumulates
2. **Leveled Compaction**: Maintains a tiered structure with non-overlapping key ranges per level
3. **Hybrid Approaches**: Combines elements of different strategies to balance trade-offs

## Compaction Process

Despite differences in strategy, all compaction approaches follow this general process:

1. **SSTable Selection**: Identify which SSTables to compact based on strategy-specific criteria
2. **Read & Merge**: Merge the selected SSTables, keeping only the most recent version of each key
3. **Tombstone Processing**: Filter out eligible tombstones that have exceeded their grace period
4. **New SSTable Creation**: Write the merged data to new SSTables
5. **Replacement**: Replace the original SSTables with the newly created ones

The upcoming sections will explore each strategy in detail, examining their algorithms, strengths, limitations, and ideal use cases.

:::warning
Compaction operations consume significant I/O and CPU resources. Most production systems implement throttling mechanisms to prevent compaction from impacting foreground operations (read/write performance).
:::
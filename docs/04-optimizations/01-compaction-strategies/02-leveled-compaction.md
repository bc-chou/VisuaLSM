---
title: Leveled Compaction
---

## Overview

Leveled Compaction Strategy (LCS) organizes SSTables into discrete levels, with each level having specific properties regarding size and key distribution. This structure dramatically improves read performance compared to Size-Tiered Compaction.

The key principle is that each level (except L0) contains non-overlapping SSTables, with each SSTable covering a distinct key range.


## How It Works

Leveled Compaction follows these key principles:

1. **Level Organization**: Data is organized into sequential levels (L0, L1, L2, ...)
   - L0 contains SSTables directly flushed from Memtables (may have overlapping key ranges)
   - L1 and higher levels maintain non-overlapping key ranges across SSTables

2. **Size Progression**: Each level has a target size, typically increasing by a factor (e.g., 10x) per level
   - If L1 targets 10MB, L2 would target 100MB, L3 would target 1GB, etc.

3. **Compaction Process**:
   - For L0→L1: Multiple L0 SSTables merge with overlapping L1 SSTables
   - For Ln→Ln+1: A single SSTable from Ln merges with overlapping SSTables from Ln+1
   - Result: New non-overlapping SSTables in the target level

This approach ensures that at most one SSTable per level needs to be checked during reads (after L0).

## Performance Characteristics

### Strengths

- **Excellent Read Performance**: Reads need to check at most one SSTable per level
- **Efficient Space Usage**: Lower space amplification as each key exists in at most one SSTable per level
- **Predictable Latencies**: More consistent performance due to smaller, more frequent compactions
- **Faster Range Scans**: Adjacent keys are likely in the same SSTable

### Limitations

- **Higher Write Amplification**: Keys may be rewritten multiple times as they move through levels
- **CPU Intensive**: More frequent compactions require more CPU resources
- **L0 Bottlenecks**: Under heavy write loads, L0 can accumulate many SSTables with overlapping ranges

## Use Cases

Leveled Compaction is particularly well-suited for:

- **Read-heavy workloads** where query latency is critical
- **Applications with frequent updates** to existing data
- **Workloads with many range scans** or sequential reads
- **Applications with strict latency requirements** that need predictable performance

:::tip
In practice, many systems use different strategies for different levels. For example, Size-Tiered for L0 (write optimization) and Leveled for L1+ (read optimization).
:::
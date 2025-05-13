---
title: Block Caching
---

## Overview

Block caching is a memory optimization technique that keeps frequently accessed SSTable blocks in RAM, eliminating the need for disk I/O for repeated reads of popular data. This optimization provides dramatic performance improvements for workloads with locality of reference.

While bloom filters and fence pointers reduce the number and size of disk reads, block caching eliminates disk reads entirely for cached data.


## How Block Caching Works

Block caching operates on the principle that data access patterns often exhibit temporal and spatial locality:

1. **Block-Level Granularity**: 
   - SSTables are divided into fixed-size blocks (typically 4-64KB)
   - Each block is a unit of caching

2. **Cache Operation**:
   - When a block is read from disk, it's stored in the block cache
   - Subsequent reads check the cache first before going to disk
   - When the cache reaches capacity, eviction policies determine which blocks to remove

3. **Cache Hierarchy**:
   - Many implementations use a two-tier cache structure
   - Hot blocks in a fast, in-memory cache
   - Warm blocks potentially in a second-tier cache (e.g., memory-mapped files)

## Implementation in LSM Trees

Most LSM Tree implementations use a combination of these caching techniques:

### Cache Components

The block cache typically includes distinct sections:

- **Data Block Cache**: Holds actual data blocks from SSTables
- **Index Block Cache**: Stores fence pointer indexes for faster lookups
- **Filter Block Cache**: Contains bloom filters for rapid existence checks

### Eviction Policies

Common cache eviction strategies include:

- **LRU (Least Recently Used)**: Evicts blocks that haven't been accessed for the longest time
- **LFU (Least Frequently Used)**: Evicts blocks with the lowest access frequency
- **FIFO (First-In-First-Out)**: Simpler strategy that evicts oldest blocks first
- **Hybrid Approaches**: Combines recency and frequency considerations


## Advanced Caching Techniques

Several advanced techniques enhance basic block caching:

### Cache Pinning

Critical blocks can be "pinned" in cache to prevent eviction:
- Index blocks are often pinned since they're small and frequently accessed
- Bloom filters may be pinned for the most recent SSTables
- Metadata blocks are typically pinned

### Prefetching

Predictive loading of blocks based on access patterns:
- Sequential prefetching for range scans
- Neighboring block prefetching for point queries with locality

### Tiered Caching

Multi-level cache architecture for optimal resource utilization:
- L1: Fast, in-memory cache for hot data (typically DRAM)
- L2: Larger, potentially slower cache for warm data (e.g., memory-mapped files)
- L3: Potential OS or storage-level caching

## Performance Implications

Block caching dramatically improves read performance with these characteristics:

- **Cache Hit Rate**: The percentage of reads served from cache without disk I/O
  - Hit rates of 90%+ are common for well-tuned applications
  - Even 50% hit rate cuts average latency in half

- **Memory Overhead**: Block cache competes with other memory-intensive components
  - Typically 20-80% of available memory in read-heavy workloads
  - Balance against Memtable size, bloom filters, and OS needs

- **Cache Warming**: Performance improves as cache populates with relevant blocks
  - Cold starts may experience higher latency
  - Production systems often pre-warm caches

## Tuning Block Cache

Effective block cache tuning involves several parameters:

- **Cache Size**: Total memory allocated to block caching
  - Too small: Low hit rates
  - Too large: Diminishing returns, memory pressure on other components

- **Block Size**: Size of individual cached units
  - Smaller blocks: More precise caching, higher metadata overhead
  - Larger blocks: Better for sequential access, potential waste for point lookups

- **Component Balance**: How to divide cache among data, index, and filter blocks
  - Typical ratio: 70-80% data blocks, 10-20% index blocks, 5-10% filter blocks
  - Workload-dependent: More index for point-lookup-heavy workloads

:::warning
Block cache is often the largest memory consumer in LSM Tree databases. Improper sizing can lead to either cache thrashing (too small) or memory pressure triggering garbage collection or swapping (too large).
:::

:::tip
For applications with predictable access patterns, consider implementing custom cache admission policies. For example, scan-detection algorithms can prevent sequential scans from polluting the cache with data that won't be reused.
:::
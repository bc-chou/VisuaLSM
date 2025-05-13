---
title: Write Amplification
---

## Overview

Write amplification occurs when the physical amount of data written to storage significantly exceeds the logical amount of data written by the application. In LSM Tree systems, this amplification is primarily caused by compaction operations, where data is repeatedly rewritten as it moves through the system.

While LSM Trees are optimized for write performance, understanding and managing write amplification is crucial for long-term efficiency and storage device longevity.


## Quantifying Write Amplification

Write amplification can be measured in several ways:

### Physical I/O Ratio

The most direct measure:

```
Write Amplification = Bytes Written to Disk / Bytes Written by Application
```

For example, if writing 1MB of data eventually causes 10MB to be written to disk through compaction, the write amplification is 10x.

### Rewrite Factor

Another useful perspective:

```
Write Amplification = Average Number of Times Each Byte is Written
```

This metric helps understand how many times data is rewritten as it flows through the LSM Tree.

## Sources of Write Amplification

Several factors contribute to write amplification in LSM Trees:

### 1. Compaction Process

- SSTables are merged and rewritten during compaction
- Each compaction operation rewrites all involved data
- The more levels data passes through, the higher the amplification

### 2. Compaction Strategy

- Leveled compaction typically has higher write amplification than size-tiered
- Each strategy has different patterns of data rewriting
- The amplification factor varies significantly between strategies

### 3. Update Frequency

- Frequently updated keys are rewritten more often
- High update rates increase overall write amplification
- Hot spots in the keyspace can cause localized high amplification

### 4. LSM Tree Shape

- Number of levels affects total write amplification
- Size ratio between levels influences amplification patterns
- Deeper trees generally have higher cumulative write amplification

## Measuring Write Amplification

Several approaches can be used to measure write amplification in production systems:

### Direct Measurement

- Track bytes written to storage devices
- Compare with application write volume
- Account for both foreground and background writes

### Compaction Statistics

- Monitor bytes read and written during compaction
- Calculate ratio against original data size
- Track compaction frequency and volume

### Write Path Analysis

- Trace the flow of writes through the system
- Measure rewrite frequency for sample data
- Analyze write patterns by key distribution


## Mathematical Model

For a simplified mathematical model of write amplification in an LSM Tree with leveled compaction:

```
WA = ∑(L_i × T_i)
```

Where:
- L_i: Level factor (how many times data at level i is rewritten)
- T_i: Proportion of total data at level i

For a K-leveled LSM Tree with size ratio T between levels:

```
WA ≈ K × T
```

For size-tiered compaction, the formula is typically:

```
WA ≈ log_T(N)
```

Where N is the number of SSTables and T is the size-tiering factor.

## Impact on Storage Devices

Write amplification has several implications for storage hardware:

### SSD Considerations

- SSDs have limited write endurance (P/E cycles)
- Write amplification accelerates SSD wear
- Wear leveling in SSDs adds another layer of write amplification

### HDD Considerations

- Less critical for HDDs than SSDs from a wear perspective
- Still impacts performance due to mechanical limitations
- Sequential vs. random write patterns become important

### Resource Utilization

- Increased I/O bandwidth consumption
- Higher CPU usage for compaction
- Greater power consumption

## Strategies to Reduce Write Amplification

Various techniques can mitigate write amplification:

### Compaction Strategy Selection

- Size-tiered compaction generally has lower write amplification than leveled
- Universal compaction (RocksDB) can adapt based on workload
- Hybrid approaches can optimize for specific access patterns

### Key-Value Separation

- Store large values separately from keys
- Only rewrite keys and metadata during compaction
- Particularly effective for large values with infrequent updates

### Tiered Storage

- Keep frequently updated data on faster storage
- Migrate stable data to lower tiers with less frequent compaction
- Optimize compaction scheduling across tiers

### Workload Adaptation

- Group keys with similar update frequencies
- Partition data to isolate hot spots
- Batch updates to reduce overall write operations

## Real-World Impact

Write amplification affects several performance dimensions:

- **Throughput**: Higher amplification reduces effective write throughput
- **Latency Spikes**: Compaction bursts can cause periodic latency increases
- **Resource Contention**: Compaction competes with foreground operations
- **Storage Costs**: Faster device wear leads to more frequent replacements
- **Energy Usage**: Higher I/O increases power consumption

:::warning
Write amplification becomes particularly concerning as database size grows. A system that performs well at small scale may experience significant performance degradation at larger scales due to increasing write amplification.
:::

## Monitoring Metrics

Key metrics to monitor for write amplification:

- **Bytes written per application write**: Ratio of physical to logical writes
- **Compaction I/O**: Amount of data read and written during compaction
- **Compaction frequency**: How often compaction operations occur
- **Write stalls**: Periods when writes are throttled due to compaction backlog
- **Storage device wear indicators**: For SSDs, factors like remaining P/E cycles

:::tip
For write-heavy workloads on SSDs, consider tuning for lower write amplification even at the expense of some read performance. This can significantly extend SSD lifetime and reduce long-term infrastructure costs.
:::
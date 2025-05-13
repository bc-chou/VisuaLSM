---
slug: /
sidebar_position: 1
title: Introduction
---

### What are LSM Trees?

Log Structured Merge Trees (LSM Tree) are a fundamental data structure used in many NoSQL key-value type database systems. They are designed to effectively handle write-heavy workloads while maintaining efficient read performance.

The architecture of LSM Trees allows for efficient scaling, enabling them to handle increasingly large datasets effectively.

LSM Trees power many widely used modern databases, such as [Cassandra](https://cassandra.apache.org/), [DynamoDB](https://aws.amazon.com/dynamodb/), [ScyllaDB](https://www.scylladb.com/), and more!


### Overview 
This documentation provides a comprehensive introduction to LSM Trees, covering these key areas:
- Basic Concepts: Fundamental components including Memtables, SSTables, and the Write-Ahead Log
- Basic Operations: Core operations including data retrieval, range queries, data insertion and deletion
- Optimizations: Techniques used to enhance LSM Tree performance, such as bloom filters and fence pointers
- Performance: Analysis of key performance trade-offs including write amplication, read amplification and space amplification

:::tip
Already familiar with LSM Trees? Head over to [Experiment](/experiment) to understand how tuning parameters affect performance!
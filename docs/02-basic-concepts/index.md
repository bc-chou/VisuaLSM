---
title: Basic Concepts
---

## Introduction

The Log Structured Merge Tree is split into two layers, **in-memory** and **on-disk**.

New records are inserted into the in-memory layer where the **Memtable** resides. 
If the insertion causes the **Memtable** component to exceed a certain size threshold, 
the data is sorted and written to disk as a **SSTable**.

![Simple LSM Tree Write Illustration](/img/lsm_workflow_01.svg)

This is a simple illustration to visualize a basic two-level LSM Tree. We'll cover more details as we go along.




#!/bin/bash

# RocksDB Benchmark Script
# This script runs benchmarks with the specified RocksDB configurations and captures performance metrics

set -o pipefail   # Makes pipeline return the exit status of the last command.

# Set the base directory for database files
DB_BASE_DIR="/tmp/rocksdb_bench"
RESULTS_DIR="./benchmark_results"
BIN_DIR="."  # Directory containing db_bench and ldb - adjust as needed
AUTO_CLEANUP=${AUTO_CLEANUP:-true}  # Automatically clean up DB directories after benchmarks

# Create results directory
mkdir -p "$RESULTS_DIR"

# Check available disk space and warn if low
check_disk_space() {
    local path="$1"
    local required_mb="$2"
    
    # Get available disk space in MB
    local available_kb=$(df -k "$path" | awk 'NR==2 {print $4}')
    local available_mb=$((available_kb / 1024))
    
    if [ "$available_mb" -lt "$required_mb" ]; then
        echo "WARNING: Low disk space on $path. Available: ${available_mb}MB, Required: ${required_mb}MB"
        echo "Consider setting a smaller NUM_KEYS or cleaning up DB directories"
        echo "You can disable automatic cleanup with AUTO_CLEANUP=false"
        echo "Continue anyway? (y/n)"
        read -r response
        if [[ "$response" != "y" ]]; then
            echo "Exiting..."
            exit 1
        fi
    fi
}

# Check disk space before starting
check_disk_space "$DB_BASE_DIR" 2000  # Require at least 2GB free

# Base configurations
declare -A BASE_CONFIGS=(
  ["read-heavy"]="read-heavy|level|64|4|10|16"
  ["write-heavy"]="write-heavy|universal|256|8|6|32"
  ["balanced"]="balanced|level|128|6|8|16"
)

# Parameter variations
COMPACTION_STYLES=("level" "universal")
WRITE_BUFFER_SIZES=(64 128 256)
LEVEL0_FILE_NUM_COMPACTION_TRIGGERS=(4 6 8)
BLOOM_BITS_PER_KEY=(0 6 8 10)
BLOCK_SIZES=(8 16 32 64)

# Bloom filter ratio - single value to use for all benchmarks
MEMTABLE_BLOOM_RATIO=0.1

# Workload definitions
declare -A WORKLOADS=(
  ["point-lookup"]="readrandom,stats|Point Lookup"
  ["range-query"]="seekrandom,stats|Range Query"
  ["write-heavy"]="fillrandom,stats|Write Heavy"
  ["mixed-write"]="readrandomwriterandom,stats|Mixed (Write Heavy 80/20)|20"
  ["mixed-read"]="readrandomwriterandom,stats|Mixed (Read Heavy 80/20)|80"
  ["mixed-balanced"]="readrandomwriterandom,stats|Mixed (Balanced 50/50)|50"
)

# Benchmark parameters with defaults
DEFAULT_NUM_KEYS=30000000
DEFAULT_BENCHMARK_SECONDS=300

# Initialize from environment variables if set
NUM_KEYS=${NUM_KEYS:-$DEFAULT_NUM_KEYS}
BENCHMARK_SECONDS=${BENCHMARK_SECONDS:-$DEFAULT_BENCHMARK_SECONDS}

# Parse custom parameters from command line (--PARAM=VALUE format)
for arg in "$@"; do
    if [[ "$arg" == --*=* ]]; then
        param_name=$(echo "$arg" | cut -d= -f1 | cut -d- -f3)
        param_value=$(echo "$arg" | cut -d= -f2)
        
        case "$param_name" in
            NUM_KEYS)
                NUM_KEYS=$param_value
                echo "Setting NUM_KEYS to $NUM_KEYS"
                ;;
            BENCHMARK_SECONDS)
                BENCHMARK_SECONDS=$param_value
                echo "Setting BENCHMARK_SECONDS to $BENCHMARK_SECONDS"
                ;;
            *)
                echo "Warning: Unknown parameter $param_name"
                ;;
        esac
    fi
done

# Function to convert compaction style name to number used by db_bench
compaction_style_to_number() {
    case $1 in
        "level")
            echo 0
            ;;
        "universal")
            echo 1
            ;;
        *)
            echo "Unknown compaction style: $1" >&2
            exit 1
            ;;
    esac
}

# Function to run a benchmark and collect metrics
run_benchmark() {
    local db_path="$1"
    local compaction_style="$2"
    local write_buffer_size="$3"
    local level0_trigger="$4"
    local bloom_bits="$5"
    local block_size="$6"
    local param_changed="$7" 
    local orig_value="$8"
    local new_value="$9"
    local preset="${10}"
    local workload="${11}"
    local workload_cmd="${12}"
    local workload_desc="${13}"
    local readwritepercent="${14}"
    
    # Wrap the entire benchmark function in error handling
    (
    # Create a trap to handle unexpected errors and avoid script termination
    trap 'echo "Error encountered in benchmark at line $LINENO, but continuing with next benchmark"; return 1' ERR
    
    local compaction_style_num=$(compaction_style_to_number "$compaction_style")
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    # Modified result file naming: use simpler name for baseline configurations
    local result_file
    if [ "$param_changed" = "baseline" ]; then
        result_file="${RESULTS_DIR}/${preset}_${workload}.json"
    else
        result_file="${RESULTS_DIR}/${preset}_${workload}_${param_changed}_${new_value}.json"
    fi
    
    echo "Running benchmark with configuration:"
    echo "  DB Path: $db_path"
    echo "  Preset: $preset"
    echo "  Workload: $workload_desc"
    echo "  Compaction Style: $compaction_style ($compaction_style_num)"
    echo "  Write Buffer Size: ${write_buffer_size}MB"
    echo "  Level0 File Num Compaction Trigger: $level0_trigger"
    echo "  Bloom Bits Per Key: $bloom_bits"
    echo "  Memtable Bloom Size Ratio: $MEMTABLE_BLOOM_RATIO"
    echo "  Block Size: ${block_size}KB"
    if [ "$param_changed" != "baseline" ]; then
        echo "  Parameter Changed: $param_changed"
        echo "  Original Value: $orig_value"
        echo "  New Value: $new_value"
    else
        echo "  Baseline Configuration"
    fi
    
    # Create a fresh DB directory
    rm -rf "$db_path"
    mkdir -p "$db_path"
    
    # Step 1: Load initial state
    echo "Step 1: Loading initial data..."
    LOAD_OUTPUT="${db_path}/fillrandom_output.txt"
    LOAD_CMD="${BIN_DIR}/db_bench \
        --db=$db_path \
        --num=$NUM_KEYS \
        --benchmarks=fillrandom \
        --compaction_style=$compaction_style_num \
        --write_buffer_size=$((write_buffer_size * 1024 * 1024)) \
        --level0_file_num_compaction_trigger=$level0_trigger \
        --bloom_bits=$bloom_bits \
        --block_size=$((block_size * 1024)) \
        --statistics=1 \
        --use_direct_io_for_flush_and_compaction=true \
        --use_direct_reads=true \
        --bytes_per_sync=1048576 \
        --read_amp_bytes_per_bit=8 \
        --seed=42"
    
    # Save the command for debugging
    echo "$LOAD_CMD" > "${db_path}/load_command.txt"
    
    # Run the load command with error handling
    set +e  # Don't exit on error
    echo "Running: $LOAD_CMD"
    # Use tee to show output in terminal while also saving to file
    eval "$LOAD_CMD" 2>&1 | tee "$LOAD_OUTPUT"
    LOAD_RESULT=$?
    set -e  # Resume exit on error
    
    if [ $LOAD_RESULT -ne 0 ]; then
        echo "WARNING: Initial data loading failed with exit code $LOAD_RESULT"
        echo "See $LOAD_OUTPUT for details"
        echo "Moving to next benchmark"
        return 1
    fi
    
    # Step 2: Run benchmark
    echo "Step 2: Running benchmarks with workload: $workload_desc"
    BENCHMARK_OUTPUT="${db_path}/benchmark_output.txt"
    
    # Base benchmark command
    BENCHMARK_CMD="${BIN_DIR}/db_bench \
        --db=$db_path \
        --benchmarks=$workload_cmd \
        --duration=$BENCHMARK_SECONDS \
        --compaction_style=$compaction_style_num \
        --write_buffer_size=$((write_buffer_size * 1024 * 1024)) \
        --level0_file_num_compaction_trigger=$level0_trigger \
        --bloom_bits=$bloom_bits \
        --block_size=$((block_size * 1024)) \
        --statistics=1 \
        --use_direct_io_for_flush_and_compaction=true \
        --use_direct_reads=true \
        --bytes_per_sync=1048576 \
        --read_amp_bytes_per_bit=8 \
        --seed=42 \
        --memtable_bloom_size_ratio=$MEMTABLE_BLOOM_RATIO"

    # Add use_existing_db for all workloads except write-heavy which requires a fresh DB
    if [[ "$workload" != "write-heavy" ]]; then
        BENCHMARK_CMD="$BENCHMARK_CMD --use_existing_db=1"
    fi
    
    # Add readwritepercent if specified (for mixed workloads)
    if [[ -n "$readwritepercent" ]]; then
        BENCHMARK_CMD="$BENCHMARK_CMD --readwritepercent=$readwritepercent"
    fi
    
    # Make sure the directory exists
    mkdir -p "$(dirname "$BENCHMARK_OUTPUT")"
    
    # Run the benchmark and capture detailed output
    # FIXED: Added tee to display output to terminal while saving to file
    echo "Running: $BENCHMARK_CMD"
    eval "$BENCHMARK_CMD" 2>&1 | tee "$BENCHMARK_OUTPUT"
    BENCHMARK_RESULT=$?
    
    # Check if benchmark completed successfully
    if [ $BENCHMARK_RESULT -ne 0 ]; then
        echo "WARNING: Benchmark command failed or returned non-zero exit code"
    fi
    
    # Save a copy of the exact command for debugging
    echo "$BENCHMARK_CMD" > "${db_path}/benchmark_command.txt"
    
    # Step 3: Collect metrics
    echo "Step 3: Collecting metrics..."
    
    # Extract properties directly from the STATISTICS section of benchmark output
    get_property() {
        local property=$1
        local stat_type=$2
        local result="-1"

        if grep -q "STATISTICS:" "$BENCHMARK_OUTPUT"; then
            local line=$(grep "$property" "$BENCHMARK_OUTPUT" | head -1)
            if [[ -n "$line" ]]; then
                if [[ "$stat_type" == "SUM" ]]; then
                    result=$(echo "$line" | grep -o "SUM : [0-9]*" | awk '{print $3}' || echo "-1")
                elif [[ "$stat_type" == "COUNT" || -z "$stat_type" ]]; then
                    result=$(echo "$line" | grep -o "COUNT : [0-9]*" | awk '{print $3}' || echo "-1")
                fi
            fi
        fi

        if ! [[ "$result" =~ ^[0-9]+$ ]]; then
            result="-1"
        fi

        echo "$result"
    }

    
    # Get disk usage
    DISK_USAGE=$(du -sb "$db_path" | awk '{print $1}')
    echo "DISK_USAGE: $DISK_USAGE"
    ESTIMATED_LIVE_DATA_SIZE=$(${BIN_DIR}/ldb --db="$db_path" get_property rocksdb.estimate-live-data-size | awk '{print $2}')
    echo "ESTIMATED_LIVE_DATA_SIZE (rocksdb.estimate-live-data-size): $ESTIMATED_LIVE_DATA_SIZE"

    # Ensure value is a valid number
    ESTIMATED_LIVE_DATA_SIZE=${ESTIMATED_LIVE_DATA_SIZE:-1}
    
    if [ "$ESTIMATED_LIVE_DATA_SIZE" != "0" ] && [ "$ESTIMATED_LIVE_DATA_SIZE" -gt 0 ]; then
        SPACE_AMPLIFICATION=$(echo "scale=3; $DISK_USAGE / $ESTIMATED_LIVE_DATA_SIZE" | bc 2>/dev/null || echo "1.0")
    else
        SPACE_AMPLIFICATION="-1.0"
    fi
    
    # Make sure SPACE_AMPLIFICATION is a valid number
    if ! [[ "$SPACE_AMPLIFICATION" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        SPACE_AMPLIFICATION="-1.0"
    fi
        
    # Get benchmark metrics with better error handling and debugging
    echo "Extracting metrics from benchmark output..."
    
    if [[ "$workload" == "mixed-balanced" || "$workload" == "mixed-read" || "$workload" == "mixed-write" ]]; then
        OPS_SEC=$(grep -i "readrandomwriterandom" "$BENCHMARK_OUTPUT" | grep -o "[0-9.]* ops/sec" | awk '{print $1}' | head -1)
        LATENCY_MICROS=$(grep -i "readrandomwriterandom" "$BENCHMARK_OUTPUT" | grep -o "[0-9.]* micros/op" | awk '{print $1}' | head -1)
        
        echo "Mixed workload metrics found: OPS=$OPS_SEC, LATENCY=$LATENCY_MICROS"
    elif [[ "$workload" == "write-heavy" ]]; then
        OPS_SEC=$(grep -i "fillrandom" "$BENCHMARK_OUTPUT" | grep -o "[0-9.]* ops/sec" | awk '{print $1}' | head -1)
        LATENCY_MICROS=$(grep -i "fillrandom" "$BENCHMARK_OUTPUT" | grep -o "[0-9.]* micros/op" | awk '{print $1}' | head -1)
        
        echo "Write-heavy workload metrics found: OPS=$OPS_SEC, LATENCY=$LATENCY_MICROS"
    elif [[ "$workload" == "point-lookup" ]]; then
        OPS_SEC=$(grep -i "readrandom" "$BENCHMARK_OUTPUT" | grep -o "[0-9.]* ops/sec" | awk '{print $1}' | head -1)
        LATENCY_MICROS=$(grep -i "readrandom" "$BENCHMARK_OUTPUT" | grep -o "[0-9.]* micros/op" | awk '{print $1}' | head -1)
        
        echo "Point-lookup workload metrics found: OPS=$OPS_SEC, LATENCY=$LATENCY_MICROS"
    elif [[ "$workload" == "range-query" ]]; then
        OPS_SEC=$(grep -i "seekrandom" "$BENCHMARK_OUTPUT" | grep -o "[0-9.]* ops/sec" | awk '{print $1}' | head -1)
        LATENCY_MICROS=$(grep -i "seekrandom" "$BENCHMARK_OUTPUT" | grep -o "[0-9.]* micros/op" | awk '{print $1}' | head -1)
        
        echo "Range-query workload metrics found: OPS=$OPS_SEC, LATENCY=$LATENCY_MICROS"
    fi
    
    # Default to -1 if values not found and validate
    OPS_SEC=${OPS_SEC:-"-1"}
    if ! [[ "$OPS_SEC" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        OPS_SEC="-1"
    fi
    
    LATENCY_MICROS=${LATENCY_MICROS:-"-1"}
    if ! [[ "$LATENCY_MICROS" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        LATENCY_MICROS="-1"
    fi
    
    echo "Final metrics: OPS=$OPS_SEC, LATENCY=$LATENCY_MICROS"
    
    # Collect statistics for calculations
    BLOOM_FILTER_USEFUL=$(get_property "rocksdb.bloom.filter.useful")
    echo "BLOOM_FILTER_USEFUL (rocksdb.bloom.filter.useful): $BLOOM_FILTER_USEFUL"

    BLOOM_FILTER_FULL_POSITIVE=$(get_property "rocksdb.bloom.filter.full.positive")
    echo "BLOOM_FILTER_FULL_POSITIVE (rocksdb.bloom.filter.full.positive): $BLOOM_FILTER_FULL_POSITIVE"

    BLOOM_FILTER_FULL_TRUE_POSITIVE=$(get_property "rocksdb.bloom.filter.full.true.positive")
    echo "BLOOM_FILTER_FULL_TRUE_POSITIVE (rocksdb.bloom.filter.full.true.positive): $BLOOM_FILTER_FULL_TRUE_POSITIVE"

    BLOCK_CACHE_HIT=$(get_property "rocksdb.block.cache.hit")
    echo "BLOCK_CACHE_HIT (rocksdb.block.cache.hit): $BLOCK_CACHE_HIT"
    BLOCK_CACHE_MISS=$(get_property "rocksdb.block.cache.miss")
    echo "BLOCK_CACHE_MISS (rocksdb.block.cache.miss): $BLOCK_CACHE_MISS"

    COMPACT_WRITE_BYTES=$(get_property "rocksdb.compact.write.bytes")
    echo "COMPACT_WRITE_BYTES (rocksdb.compact.write.bytes): $COMPACT_WRITE_BYTES"
    FLUSH_WRITE_BYTES=$(get_property "rocksdb.flush.write.bytes")
    echo "FLUSH_WRITE_BYTES (rocksdb.flush.write.bytes): $FLUSH_WRITE_BYTES"
    BYTES_WRITTEN=$(get_property "rocksdb.bytes.written")
    echo "BYTES_WRITTEN (rocksdb.bytes.written): $BYTES_WRITTEN"

    READ_AMP_TOTAL_READ_BYTES=$(get_property "rocksdb.read.amp.total.read.bytes")
    echo "READ_AMP_TOTAL_READ_BYTES (rocksdb.read.amp.total.read.bytes): $READ_AMP_TOTAL_READ_BYTES"
    READ_AMP_ESTIMATE_USEFUL_BYTES=$(get_property "rocksdb.read.amp.estimate.useful.bytes")
    echo "READ_AMP_ESTIMATE_USEFUL_BYTES (rocksdb.read.amp.estimate.useful.bytes): $READ_AMP_ESTIMATE_USEFUL_BYTES"

    COMPACTION_TIMES_MICROS=$(get_property "rocksdb.compaction.times.micros" "SUM")
    echo "COMPACTION_TIMES_MICROS (rocksdb.compaction.times.micros): $COMPACTION_TIMES_MICROS"
    COMPACTION_COUNT=$(get_property "rocksdb.compaction.times.micros" "COUNT")
    echo "COMPACTION_COUNT (rocksdb.compaction.times.micros): $COMPACTION_COUNT"
    COMPACT_READ_BYTES=$(get_property "rocksdb.compact.read.bytes")
    echo "COMPACT_READ_BYTES (rocksdb.compact.read.bytes): $COMPACT_READ_BYTES"
    
    # Extract percentile values from benchmark output 
    get_percentile() {
        local metric=$1
        local percentile=$2
        local value="-1"
        
        # Example format: "rocksdb.db.get.micros P50 : 13.031223 P95 : 217.934080 P99 : 371.869761 P100 : 8205.000000"
        # Look for the exact statistic line with all percentiles
        local stat_line=$(grep "$metric" "$BENCHMARK_OUTPUT" | grep "P50" | grep "P95" | grep "P99" | head -1)
        
        if [[ -n "$stat_line" ]]; then
            # Extract the specific percentile value
            value=$(echo "$stat_line" | grep -o "$percentile : [0-9.]*" | awk '{print $3}' | head -1)
        fi
        
        # If we couldn't find it with the main approach, try alternative patterns
        if [[ -z "$value" ]]; then
            # Try to find just the specific percentile within the file
            value=$(grep "$metric" "$BENCHMARK_OUTPUT" | grep "$percentile" | grep -o "$percentile : [0-9.]*" | awk '{print $3}' | head -1)
            
            # If still not found, try looking for percentile=value format
            if [[ -z "$value" ]]; then
                value=$(grep "$metric" "$BENCHMARK_OUTPUT" | grep -o "$percentile=[0-9.]*" | cut -d'=' -f2 | head -1)
            fi
        fi
        
        # Ensure we return a valid number
        if [[ -z "$value" || ! "$value" =~ ^[0-9]+\.?[0-9]*$ ]]; then
            value="-1"
        fi
        
        echo "$value"
    }
    
    # Get histogram values from the benchmark output with better error handling
    echo "Extracting latency percentiles..."
    READ_LATENCY_P50=$(get_percentile "rocksdb.db.get.micros" "P50")
    READ_LATENCY_P95=$(get_percentile "rocksdb.db.get.micros" "P95")
    READ_LATENCY_P99=$(get_percentile "rocksdb.db.get.micros" "P99")
    READ_LATENCY_P100=$(get_percentile "rocksdb.db.get.micros" "P100")
    
    WRITE_LATENCY_P50=$(get_percentile "rocksdb.db.write.micros" "P50")
    WRITE_LATENCY_P95=$(get_percentile "rocksdb.db.write.micros" "P95")
    WRITE_LATENCY_P99=$(get_percentile "rocksdb.db.write.micros" "P99")
    WRITE_LATENCY_P100=$(get_percentile "rocksdb.db.write.micros" "P100")
    
    echo "Read latencies: P50=$READ_LATENCY_P50, P95=$READ_LATENCY_P95, P99=$READ_LATENCY_P99, P100=$READ_LATENCY_P100"
    echo "Write latencies: P50=$WRITE_LATENCY_P50, P95=$WRITE_LATENCY_P95, P99=$WRITE_LATENCY_P99, P100=$WRITE_LATENCY_P100"
   
    # Calculate metrics

    # Ensure values are valid numbers
    BLOCK_CACHE_HIT=${BLOCK_CACHE_HIT:-"-1"}
    BLOCK_CACHE_MISS=${BLOCK_CACHE_MISS:-"-1"}
    
    # Calculate block cache hit ratio
    if [ "$BLOCK_CACHE_HIT" != "-1" ] && [ "$BLOCK_CACHE_MISS" != "-1" ]; then
        # Force floating point calculation with scale=3
        BLOCK_CACHE_HIT_RATIO=$(echo "scale=3; $BLOCK_CACHE_HIT / ($BLOCK_CACHE_HIT + $BLOCK_CACHE_MISS)" | bc | sed 's/^\./0./')
        echo "Debug: $BLOCK_CACHE_HIT / ($BLOCK_CACHE_HIT + $BLOCK_CACHE_MISS) = $BLOCK_CACHE_HIT_RATIO"
    else
        BLOCK_CACHE_HIT_RATIO="-1"
    fi

    # Calculate bloom filter effectiveness
    if [ "$BLOOM_FILTER_USEFUL" != "-1" ] && [ "$BLOOM_FILTER_FULL_POSITIVE" != "-1" ] && [ "$BLOOM_FILTER_FULL_TRUE_POSITIVE" != "-1" ] && [ "$((BLOOM_FILTER_FULL_POSITIVE - BLOOM_FILTER_FULL_TRUE_POSITIVE))" -ne 0 ]; then
        # Force floating point calculation with scale=3
        BLOOM_FILTER_EFFECTIVENESS=$(echo "scale=3; $BLOOM_FILTER_USEFUL / ($BLOOM_FILTER_USEFUL + $BLOOM_FILTER_FULL_POSITIVE - $BLOOM_FILTER_FULL_TRUE_POSITIVE)" | bc | sed 's/^\./0./')
        echo "Debug: $BLOOM_FILTER_USEFUL / ($BLOOM_FILTER_USEFUL + $BLOOM_FILTER_FULL_POSITIVE - $BLOOM_FILTER_FULL_TRUE_POSITIVE) = $BLOOM_FILTER_EFFECTIVENESS"
    else
        BLOOM_FILTER_EFFECTIVENESS="-1"
    fi


    # Ensure values are valid numbers
    COMPACT_WRITE_BYTES=${COMPACT_WRITE_BYTES:-"-1"}
    FLUSH_WRITE_BYTES=${FLUSH_WRITE_BYTES:-"-1"}
    BYTES_WRITTEN=${BYTES_WRITTEN:-"-1"}
    
    # Calculate write amplification
    if [ "$BYTES_WRITTEN" != "-1" ] && [ "$BYTES_WRITTEN" != "0" ]; then
        WRITE_AMPLIFICATION=$(echo "scale=3; ($COMPACT_WRITE_BYTES + $FLUSH_WRITE_BYTES) / $BYTES_WRITTEN" | bc)
    else
        WRITE_AMPLIFICATION="-1"
    fi
    
    # Ensure values are valid numbers
    READ_AMP_TOTAL_READ_BYTES=${READ_AMP_TOTAL_READ_BYTES:-"-1"}
    READ_AMP_ESTIMATE_USEFUL_BYTES=${READ_AMP_ESTIMATE_USEFUL_BYTES:-"-1"}
    
    # Calculate read amplification
    if [ "$READ_AMP_ESTIMATE_USEFUL_BYTES" != "-1" ] && [ "$READ_AMP_ESTIMATE_USEFUL_BYTES" != "0" ]; then
        READ_AMPLIFICATION=$(echo "scale=3; $READ_AMP_TOTAL_READ_BYTES / $READ_AMP_ESTIMATE_USEFUL_BYTES" | bc | sed 's/^\./0./')
    else
        READ_AMPLIFICATION="-1"
    fi
    
    # Ensure values are valid numbers
    COMPACTION_TIMES_MICROS=${COMPACTION_TIMES_MICROS:-"-1"}
    COMPACTION_COUNT=${COMPACTION_COUNT:-"-1"}
    COMPACT_READ_BYTES=${COMPACT_READ_BYTES:-"-1"}
    
    # Compaction throughput (MB/s) with safer calculation
    if [ "$COMPACTION_TIMES_MICROS" != "-1" ] && [ "$COMPACTION_TIMES_MICROS" -gt 0 ]; then
        COMPACTION_THROUGHPUT=$(echo "scale=1; ($COMPACT_READ_BYTES + $COMPACT_WRITE_BYTES) / (2 * $COMPACTION_TIMES_MICROS) * 1000000 / (1024*1024)" | bc 2>/dev/null || echo "-1")
    else
        COMPACTION_THROUGHPUT="-1"
    fi
    
    # Make sure COMPACTION_THROUGHPUT is a valid number
    if ! [[ "$COMPACTION_THROUGHPUT" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        COMPACTION_THROUGHPUT="-1"
    fi
    
    # Average compaction latency (ms) with safer calculation
    if [ "$COMPACTION_COUNT" != "-1" ] && [ "$COMPACTION_COUNT" -gt 0 ]; then
        COMPACTION_LATENCY=$(echo "scale=0; $COMPACTION_TIMES_MICROS / $COMPACTION_COUNT / 1000" | bc 2>/dev/null || echo "-1")
    else
        COMPACTION_LATENCY="-1"
    fi
    
    # Make sure COMPACTION_LATENCY is a valid number
    if ! [[ "$COMPACTION_LATENCY" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        COMPACTION_LATENCY="-1"
    fi
    
    # Validate all metric values before writing JSON
    # Function to ensure a value is a valid number
    ensure_valid_number() {
        local var_name=$1
        local var_value=${!var_name}
        
        # If empty or not a number, use default
        if [[ -z "$var_value" || ! "$var_value" =~ ^[0-9]*\.?[0-9]*$ ]]; then
            eval "$var_name=0"
        fi
    }
    
    # Validate all numeric metrics
    ensure_valid_number "READ_AMPLIFICATION"
    ensure_valid_number "WRITE_AMPLIFICATION"
    ensure_valid_number "SPACE_AMPLIFICATION"
    ensure_valid_number "OPS_SEC"
    ensure_valid_number "LATENCY_MICROS"
    ensure_valid_number "BLOCK_CACHE_HIT_RATIO"
    ensure_valid_number "BLOOM_FILTER_EFFECTIVENESS"
    ensure_valid_number "COMPACTION_THROUGHPUT"
    ensure_valid_number "COMPACTION_LATENCY"
    ensure_valid_number "READ_LATENCY_P50"
    ensure_valid_number "READ_LATENCY_P95"
    ensure_valid_number "READ_LATENCY_P99"
    ensure_valid_number "READ_LATENCY_P100"
    ensure_valid_number "WRITE_LATENCY_P50"
    ensure_valid_number "WRITE_LATENCY_P95"
    ensure_valid_number "WRITE_LATENCY_P99"
    ensure_valid_number "WRITE_LATENCY_P100"
    
    # Output JSON result with validated values
    cat > "$result_file" << EOL
{
  "results": {
    "read_amplification": $READ_AMPLIFICATION,
    "write_amplification": $WRITE_AMPLIFICATION,
    "space_amplification": $SPACE_AMPLIFICATION,
    "operation_throughput_ops": $OPS_SEC,
    "operation_latency_micros": $LATENCY_MICROS,
    "block_cache_hit_ratio": $BLOCK_CACHE_HIT_RATIO,
    "bloom_filter_useful": $BLOOM_FILTER_EFFECTIVENESS,
    "compaction_throughput": $COMPACTION_THROUGHPUT,
    "compaction_latency": $COMPACTION_LATENCY,
    "read_latency_p50": $READ_LATENCY_P50,
    "read_latency_p95": $READ_LATENCY_P95,
    "read_latency_p99": $READ_LATENCY_P99,
    "read_latency_p100": $READ_LATENCY_P100,
    "write_latency_p50": $WRITE_LATENCY_P50,
    "write_latency_p95": $WRITE_LATENCY_P95,
    "write_latency_p99": $WRITE_LATENCY_P99,
    "write_latency_p100": $WRITE_LATENCY_P100
  }
}
EOL
    
    echo "Benchmark complete. Results saved to $result_file"
    
    # Clean up DB directory if auto-cleanup is enabled
    if [ "$AUTO_CLEANUP" = true ]; then
        echo "Cleaning up DB directory to save disk space..."
        rm -rf "$db_path"
        echo "DB directory removed."
    fi
    
    echo "----------------------------------------------"
    
    # End of error handling trap section
    ) || {
        echo "ERROR: Benchmark failed for configuration:"
        echo "  Preset: $preset"
        echo "  Workload: $workload"
        if [ "$param_changed" != "baseline" ]; then
            echo "  Parameter: $param_changed ($orig_value → $new_value)"
        else
            echo "  Baseline Configuration"
        fi
        
        # Clean up DB directory on failure if auto-cleanup is enabled
        if [ "$AUTO_CLEANUP" = true ]; then
            echo "Cleaning up DB directory after failure..."
            rm -rf "$db_path"
        fi
        
        echo "Continuing with next benchmark..."
    }
}

# Function to run the baseline configuration for a preset and workload
run_baseline() {
    local preset=$1
    local workload=$2
    
    # Get preset configuration
    IFS='|' read -ra CONFIG <<< "${BASE_CONFIGS[$preset]}"
    local preset_name="${CONFIG[0]}"
    local compaction_style="${CONFIG[1]}"
    local write_buffer_size="${CONFIG[2]}"
    local level0_trigger="${CONFIG[3]}"
    local bloom_bits="${CONFIG[4]}"
    local block_size="${CONFIG[5]}"
    
    # Get workload configuration
    IFS='|' read -ra WCONFIG <<< "${WORKLOADS[$workload]}"
    local workload_cmd="${WCONFIG[0]}"
    local workload_desc="${WCONFIG[1]}"
    local readwritepercent="${WCONFIG[2]:-}"
    
    # Path for this configuration
    local db_path="${DB_BASE_DIR}/${preset}_${workload}_baseline"
    
    # Run the benchmark
    run_benchmark "$db_path" \
        "$compaction_style" \
        "$write_buffer_size" \
        "$level0_trigger" \
        "$bloom_bits" \
        "$block_size" \
        "baseline" \
        "baseline" \
        "baseline" \
        "$preset_name" \
        "$workload" \
        "$workload_cmd" \
        "$workload_desc" \
        "$readwritepercent"
}

# Function to run parameter variations for a preset and workload
run_parameter_variations() {
    local preset=$1
    local workload=$2
    
    # Get preset configuration
    IFS='|' read -ra CONFIG <<< "${BASE_CONFIGS[$preset]}"
    local preset_name="${CONFIG[0]}"
    local base_compaction_style="${CONFIG[1]}"
    local base_write_buffer_size="${CONFIG[2]}"
    local base_level0_trigger="${CONFIG[3]}"
    local base_bloom_bits="${CONFIG[4]}"
    local base_block_size="${CONFIG[5]}"
    
    # Get workload configuration
    IFS='|' read -ra WCONFIG <<< "${WORKLOADS[$workload]}"
    local workload_cmd="${WCONFIG[0]}"
    local workload_desc="${WCONFIG[1]}"
    local readwritepercent="${WCONFIG[2]:-}"
    
    echo "Running parameter variations for preset '$preset_name' with workload '$workload_desc'..."
    
    # 1. Vary compaction style
    for style in "${COMPACTION_STYLES[@]}"; do
        if [ "$style" != "$base_compaction_style" ]; then
            local db_path="${DB_BASE_DIR}/${preset}_${workload}_compaction_${style}"
            
            run_benchmark "$db_path" \
                "$style" \
                "$base_write_buffer_size" \
                "$base_level0_trigger" \
                "$base_bloom_bits" \
                "$base_block_size" \
                "compaction_style" \
                "$base_compaction_style" \
                "$style" \
                "$preset_name" \
                "$workload" \
                "$workload_cmd" \
                "$workload_desc" \
                "$readwritepercent"
        fi
    done
    
    # 2. Vary write buffer size
    for wbs in "${WRITE_BUFFER_SIZES[@]}"; do
        if [ "$wbs" != "$base_write_buffer_size" ]; then
            local db_path="${DB_BASE_DIR}/${preset}_${workload}_write_buffer_${wbs}"
            
            run_benchmark "$db_path" \
                "$base_compaction_style" \
                "$wbs" \
                "$base_level0_trigger" \
                "$base_bloom_bits" \
                "$base_block_size" \
                "write_buffer_size" \
                "$base_write_buffer_size" \
                "$wbs" \
                "$preset_name" \
                "$workload" \
                "$workload_cmd" \
                "$workload_desc" \
                "$readwritepercent"
        fi
    done
    
    # 3. Vary level0 file num compaction trigger
    for l0t in "${LEVEL0_FILE_NUM_COMPACTION_TRIGGERS[@]}"; do
        if [ "$l0t" != "$base_level0_trigger" ]; then
            local db_path="${DB_BASE_DIR}/${preset}_${workload}_level0_trigger_${l0t}"
            
            run_benchmark "$db_path" \
                "$base_compaction_style" \
                "$base_write_buffer_size" \
                "$l0t" \
                "$base_bloom_bits" \
                "$base_block_size" \
                "level0_file_num_compaction_trigger" \
                "$base_level0_trigger" \
                "$l0t" \
                "$preset_name" \
                "$workload" \
                "$workload_cmd" \
                "$workload_desc" \
                "$readwritepercent"
        fi
    done
    
    # 4. Vary bloom bits per key
    for bloom in "${BLOOM_BITS_PER_KEY[@]}"; do
        if [ "$bloom" != "$base_bloom_bits" ]; then
            local db_path="${DB_BASE_DIR}/${preset}_${workload}_bloom_bits_${bloom}"
            
            run_benchmark "$db_path" \
                "$base_compaction_style" \
                "$base_write_buffer_size" \
                "$base_level0_trigger" \
                "$bloom" \
                "$base_block_size" \
                "bloom_bits_per_key" \
                "$base_bloom_bits" \
                "$bloom" \
                "$preset_name" \
                "$workload" \
                "$workload_cmd" \
                "$workload_desc" \
                "$readwritepercent"
        fi
    done
    
    # 5. Vary block size
    for bs in "${BLOCK_SIZES[@]}"; do
        if [ "$bs" != "$base_block_size" ]; then
            local db_path="${DB_BASE_DIR}/${preset}_${workload}_block_size_${bs}"
            
            run_benchmark "$db_path" \
                "$base_compaction_style" \
                "$base_write_buffer_size" \
                "$base_level0_trigger" \
                "$base_bloom_bits" \
                "$bs" \
                "block_size" \
                "$base_block_size" \
                "$bs" \
                "$preset_name" \
                "$workload" \
                "$workload_cmd" \
                "$workload_desc" \
                "$readwritepercent"
        fi
    done
}

# Function to run all benchmarks for all presets and workloads
run_all_benchmarks() {
    echo "Running RocksDB benchmarks for all configurations and workloads..."
    
    for preset in "${!BASE_CONFIGS[@]}"; do
        for workload in "${!WORKLOADS[@]}"; do
            echo "======================================================"
            echo "Starting benchmark set: Preset=$preset, Workload=$workload"
            echo "======================================================"
            
            # First run the baseline
            run_baseline "$preset" "$workload"
            
            # Then run all parameter variations
            run_parameter_variations "$preset" "$workload"
        done
    done
    
    echo "All benchmarks complete!"
}

# Function to run benchmarks for a specific preset and workload
run_specific_benchmark() {
    local preset=$1
    local workload=$2
    
    if [[ -z "$preset" || -z "${BASE_CONFIGS[$preset]}" ]]; then
        echo "Error: Invalid preset '$preset'. Available presets: ${!BASE_CONFIGS[@]}"
        exit 1
    fi
    
    if [[ -z "$workload" || -z "${WORKLOADS[$workload]}" ]]; then
        echo "Error: Invalid workload '$workload'. Available workloads: ${!WORKLOADS[@]}"
        exit 1
    fi
    
    echo "Running benchmarks for preset '$preset' with workload '$workload'..."
    
    # Run the baseline
    run_baseline "$preset" "$workload"
    
    # Run all parameter variations
    run_parameter_variations "$preset" "$workload"
    
    echo "Benchmarks for preset '$preset' with workload '$workload' complete!"
}

# Function to run only baseline configuration for specific preset and workload
run_baseline_only() {
    local preset=$1
    local workload=$2
    
    if [[ -z "$preset" || -z "${BASE_CONFIGS[$preset]}" ]]; then
        echo "Error: Invalid preset '$preset'. Available presets: ${!BASE_CONFIGS[@]}"
        exit 1
    fi
    
    if [[ -z "$workload" || -z "${WORKLOADS[$workload]}" ]]; then
        echo "Error: Invalid workload '$workload'. Available workloads: ${!WORKLOADS[@]}"
        exit 1
    fi
    
    echo "Running baseline configuration for preset '$preset' with workload '$workload'..."
    
    # Run only the baseline
    run_baseline "$preset" "$workload"
    
    echo "Baseline benchmark for preset '$preset' with workload '$workload' complete!"
}

# Function to run a single parameter variation
run_single_variation() {
    local preset=$1
    local workload=$2
    local param=$3
    local value=$4
    
    if [[ -z "$preset" || -z "${BASE_CONFIGS[$preset]}" ]]; then
        echo "Error: Invalid preset '$preset'. Available presets: ${!BASE_CONFIGS[@]}"
        exit 1
    fi
    
    if [[ -z "$workload" || -z "${WORKLOADS[$workload]}" ]]; then
        echo "Error: Invalid workload '$workload'. Available workloads: ${!WORKLOADS[@]}"
        exit 1
    fi
    
    # Get preset configuration
    IFS='|' read -ra CONFIG <<< "${BASE_CONFIGS[$preset]}"
    local preset_name="${CONFIG[0]}"
    local base_compaction_style="${CONFIG[1]}"
    local base_write_buffer_size="${CONFIG[2]}"
    local base_level0_trigger="${CONFIG[3]}"
    local base_bloom_bits="${CONFIG[4]}"
    local base_block_size="${CONFIG[5]}"
    
    # Get workload configuration
    IFS='|' read -ra WCONFIG <<< "${WORKLOADS[$workload]}"
    local workload_cmd="${WCONFIG[0]}"
    local workload_desc="${WCONFIG[1]}"
    local readwritepercent="${WCONFIG[2]:-}"
    
    # Variables for the variation
    local compaction_style="$base_compaction_style"
    local write_buffer_size="$base_write_buffer_size"
    local level0_trigger="$base_level0_trigger"
    local bloom_bits="$base_bloom_bits"
    local block_size="$base_block_size"
    local original_value=""
    
    # Apply the parameter change
    case "$param" in
        "compaction_style")
            original_value="$compaction_style"
            compaction_style="$value"
            ;;
        "write_buffer_size")
            original_value="$write_buffer_size"
            write_buffer_size="$value"
            ;;
        "level0_file_num_compaction_trigger")
            original_value="$level0_trigger"
            level0_trigger="$value"
            ;;
        "bloom_bits_per_key")
            original_value="$bloom_bits"
            bloom_bits="$value"
            ;;
        "block_size")
            original_value="$block_size"
            block_size="$value"
            ;;
        *)
            echo "Error: Invalid parameter '$param'. Available parameters: compaction_style, write_buffer_size, level0_file_num_compaction_trigger, bloom_bits_per_key, block_size"
            exit 1
            ;;
    esac
    
    # Path for this configuration
    local db_path="${DB_BASE_DIR}/${preset}_${workload}_${param}_${value}"
    
    # Run the benchmark
    run_benchmark "$db_path" \
        "$compaction_style" \
        "$write_buffer_size" \
        "$level0_trigger" \
        "$bloom_bits" \
        "$block_size" \
        "$param" \
        "$original_value" \
        "$value" \
        "$preset_name" \
        "$workload" \
        "$workload_cmd" \
        "$workload_desc" \
        "$readwritepercent"
}

# Show help information
show_help() {
    echo "RocksDB Benchmark Script"
    echo ""
    echo "Usage: $0 [command] [options] [--PARAM=VALUE ...]"
    echo ""
    echo "Commands:"
    echo "  all                                     Run all benchmarks for all presets and workloads"
    echo "  preset PRESET WORKLOAD                  Run benchmarks for a specific preset and workload"
    echo "  baseline PRESET WORKLOAD                Run only the baseline configuration for a specific preset and workload"
    echo "  variation PRESET WORKLOAD PARAM VALUE   Run a single parameter variation"
    echo "  help                                    Show this help message"
    echo ""
    echo "Global Parameters:"
    echo "  --NUM_KEYS=NUMBER                       Set the number of keys to use (default: 30000000)"
    echo "  --BENCHMARK_SECONDS=NUMBER              Set the benchmark duration in seconds (default: 60)"
    echo ""
    echo "Presets:"
    for preset in "${!BASE_CONFIGS[@]}"; do
        IFS='|' read -ra CONFIG <<< "${BASE_CONFIGS[$preset]}"
        echo "  $preset: ${CONFIG[0]}"
    done
    echo ""
    echo "Workloads:"
    for workload in "${!WORKLOADS[@]}"; do
        IFS='|' read -ra CONFIG <<< "${WORKLOADS[$workload]}"
        echo "  $workload: ${CONFIG[1]}"
    done
    echo ""
    echo "Parameters:"
    echo "  compaction_style               Compaction style (level or universal)"
    echo "  write_buffer_size              Write buffer size in MB"
    echo "  level0_file_num_compaction_trigger  Level0 file num compaction trigger"
    echo "  bloom_bits_per_key             Bloom bits per key"
    echo "  block_size                     Block size in KB"
    echo ""
    echo "Examples:"
    echo "  $0 all"
    echo "  $0 preset read-heavy point-lookup"
    echo "  $0 baseline balanced mixed-balanced"
    echo "  $0 variation balanced mixed-balanced block_size 32"
    echo ""
}

# Extract the main command arguments (filtering out --PARAM=VALUE style args)
MAIN_ARGS=()
for arg in "$@"; do
    if [[ "$arg" != --*=* ]]; then
        MAIN_ARGS+=("$arg")
    fi
done

# Parse main command arguments
case "${MAIN_ARGS[0]}" in
    "all")
        run_all_benchmarks
        ;;
    "preset")
        if [ ${#MAIN_ARGS[@]} -lt 3 ]; then
            echo "Error: Missing arguments for 'preset' command"
            show_help
            exit 1
        fi
        run_specific_benchmark "${MAIN_ARGS[1]}" "${MAIN_ARGS[2]}"
        ;;
    "baseline")
        if [ ${#MAIN_ARGS[@]} -lt 3 ]; then
            echo "Error: Missing arguments for 'baseline' command"
            show_help
            exit 1
        fi
        run_baseline_only "${MAIN_ARGS[1]}" "${MAIN_ARGS[2]}"
        ;;
    "variation")
        if [ ${#MAIN_ARGS[@]} -lt 5 ]; then
            echo "Error: Missing arguments for 'variation' command"
            show_help
            exit 1
        fi
        run_single_variation "${MAIN_ARGS[1]}" "${MAIN_ARGS[2]}" "${MAIN_ARGS[3]}" "${MAIN_ARGS[4]}"
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        echo "Unknown command: ${MAIN_ARGS[0]}"
        show_help
        exit 1
        ;;
esac
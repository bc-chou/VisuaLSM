import React, { useState, useEffect } from 'react';
import styles from "./styles/experiment.module.css";
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// Import components
import ConfigSelector from './components/ConfigSelector';
import ParameterSelector from './components/ParameterSelector';
import ResultsPanel from './components/ResultsPanel';
import ExplanationPanel from './components/ExplanationPanel';

/**
 * Main component for the LSM Tree parameter impact explorer
 */
const LSMTreeExperiment = () => {
  // Docusaurus context env variables
  const {siteConfig} = useDocusaurusContext();

  // State
  const [baseConfigs, setBaseConfigs] = useState(null);
  const [workloadTypes, setWorkloadTypes] = useState(null);
  const [parameterOptions, setParameterOptions] = useState(null);
  
  // Benchmark results cache
  const [benchmarkResults, setBenchmarkResults] = useState({});
  const [parameterVariations, setParameterVariations] = useState({});
  
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [selectedWorkload, setSelectedWorkload] = useState(null);
  const [changedParameter, setChangedParameter] = useState(null);
  const [parameterValue, setParameterValue] = useState(null);
  
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false); // Default to collapsed
  

useEffect(() => {
  const loadData = async () => {
    console.log("Attempting to load configuration data...");
    
    try {
      console.log("Fetching base_configs.json...");
      const baseConfigsResponse = await fetch('/data/base_configs.json');
      if (!baseConfigsResponse.ok) {
        console.error(`Failed to fetch base_configs.json: ${baseConfigsResponse.status} ${baseConfigsResponse.statusText}`);
        throw new Error(`Failed to fetch base_configs.json: ${baseConfigsResponse.status}`);
      }
      console.log("base_configs.json fetched successfully!");
      
      console.log("Fetching workload_types.json...");
      const workloadsResponse = await fetch('/data/workload_types.json');
      if (!workloadsResponse.ok) {
        console.error(`Failed to fetch workload_types.json: ${workloadsResponse.status} ${workloadsResponse.statusText}`);
        throw new Error(`Failed to fetch workload_types.json: ${workloadsResponse.status}`);
      }
      console.log("workload_types.json fetched successfully!");
      
      console.log("Fetching parameter_options.json...");
      const paramOptionsResponse = await fetch('/data/parameter_options.json');
      if (!paramOptionsResponse.ok) {
        console.error(`Failed to fetch parameter_options.json: ${paramOptionsResponse.status} ${paramOptionsResponse.statusText}`);
        throw new Error(`Failed to fetch parameter_options.json: ${paramOptionsResponse.status}`);
      }
      console.log("parameter_options.json fetched successfully!");
      
      // Parse JSON responses
      const baseConfigsData = await baseConfigsResponse.json();
      const workloadsData = await workloadsResponse.json();
      const paramOptionsData = await paramOptionsResponse.json();
      
      console.log("All data parsed successfully!");
      
      // Set state with loaded data
      setBaseConfigs(baseConfigsData);
      setWorkloadTypes(workloadsData);
      setParameterOptions(paramOptionsData);
      
      // Set default selections
      const defaultPreset = "balanced";
      const defaultWorkload = "mixed-balanced";
      setSelectedPreset(defaultPreset); 
      setSelectedWorkload(defaultWorkload);
      
      setIsLoadingConfigs(false);
      console.log("Configuration loaded from external files successfully!");
      
    } catch (error) {
      console.error("Error loading configuration files:", error);
      setIsLoadingConfigs(false);
    }
  };
  
  loadData();
}, []);

  // Load base benchmark results when preset or workload changes
  useEffect(() => {
    if (!baseConfigs || !selectedPreset || !selectedWorkload) return;
    
    // Reset parameter selection when changing preset or workload
    setChangedParameter(null);
    setParameterValue(null);
    
    // Create a cache key for this preset-workload combination
    const cacheKey = `${selectedPreset}-${selectedWorkload}`;
    
    if (!benchmarkResults[cacheKey]) {
      console.log(`Loading benchmark data for ${cacheKey}...`);
      setIsLoadingResults(true);
      
      fetchBenchmarkResults(selectedPreset, selectedWorkload)
        .then(benchmarkData => {
          // Store the benchmark data in the cache
          setBenchmarkResults(prev => ({
            ...prev,
            [cacheKey]: benchmarkData
          }));
          setIsLoadingResults(false);
        })
        .catch(error => {
          console.error(`Error fetching benchmark data for ${cacheKey}:`, error);
          setIsLoadingResults(false);
        });
    }
  }, [selectedPreset, selectedWorkload, baseConfigs]);
  
 const fetchBenchmarkResults = async (preset, workload, parameter = null, value = null) => {
  let fileName;
  
  if (parameter === null || value === null) {
    fileName = `${preset}_${workload}.json`;
  } else {
    fileName = `${preset}_${workload}_${parameter}_${value}.json`;
  }
  
  // First try to fetch from S3
  // This projects assumes a simple public S3 bucket URL structure
  // You should use a proper API Gateway to handle S3 access for production use case
  const s3BucketUrl = siteConfig.S3_BUCKET_URL || "https://your-s3-bucket-url";
  const s3Url = `${s3BucketUrl}/benchmark_results/${fileName}`;
  
  console.log(`Attempting to fetch from S3: ${s3Url}`);
  
  try {
    // Try fetching from S3 first
    const s3Response = await fetch(s3Url).catch(error => {
      console.warn(`Failed to fetch from S3: ${error.message}`);
      return { ok: false };
    });
    
    if (s3Response.ok) {
      // S3 fetch successful
      const benchmarkData = await s3Response.json();
      console.log("Successfully loaded benchmark data from S3");
      
      return {
        params: parameter ? {
          ...baseConfigs[preset].params,
          [parameter]: value
        } : baseConfigs[preset].params,
        results: benchmarkData.results
      };
    }
    
    // If S3 fetch failed, try local static files
    console.log("S3 fetch failed, falling back to local static files");
    const localFilePath = `/data/benchmark_results/${fileName}`;
    console.log(`Attempting to fetch from local: ${localFilePath}`);
    
    const localResponse = await fetch(localFilePath).catch(error => {
      console.warn(`Failed to fetch from local path: ${error.message}`);
      return { ok: false };
    });
    
    if (localResponse.ok) {
      // Local fetch successful
      const benchmarkData = await localResponse.json();
      console.log("Successfully loaded benchmark data from local files");
      
      return {
        params: parameter ? {
          ...baseConfigs[preset].params,
          [parameter]: value
        } : baseConfigs[preset].params,
        results: benchmarkData.results
      };
    }
    
    // If both S3 and local fetch failed, show error
    throw new Error(`Could not fetch benchmark data for ${fileName} from S3 or local files`);
    
  } catch (error) {
    console.error(`Error fetching benchmark data: ${error.message}`);
    throw error; // Re-throw to be handled by the caller
  }
};
  
  // Handle parameter change
  const handleParameterChange = async (parameter, value) => {
    // If already selected, toggle off
    if (parameter === changedParameter && parameterValue === value) {
      setChangedParameter(null);
      setParameterValue(null);
      return;
    }
    
    // Create a cache key for this specific variation
    const variationKey = `${selectedPreset}-${selectedWorkload}-${parameter}-${value}`;
    
    // Check if we already have this variation in cache
    if (parameterVariations[variationKey]) {
      console.log("Using cached variation data for:", variationKey);
      setChangedParameter(parameter);
      setParameterValue(value);
      return;
    }
    
    // Otherwise, fetch the variation data
    setIsLoadingResults(true);
    
    // Fetch the parameter variation
    fetchBenchmarkResults(selectedPreset, selectedWorkload, parameter, value)
      .then(variationData => {
        // Store the variation data in the cache
        setParameterVariations(prev => ({
          ...prev,
          [variationKey]: variationData
        }));
        
        // Update state
        setChangedParameter(parameter);
        setParameterValue(value);
        setIsLoadingResults(false);
      })
      .catch(error => {
        console.error(`Error fetching variation data for ${variationKey}:`, error);
        setIsLoadingResults(false);
      });
  };
  
  // Toggle explanations visibility
  const handleToggleExplanations = () => {
    setShowExplanations(!showExplanations);
  };
  
  // Get current configuration data
  const getCurrentConfig = () => {
    if (!baseConfigs || !selectedPreset || !selectedWorkload) return null;
    
    // Get the workload-adjusted configuration
    const cacheKey = `${selectedPreset}-${selectedWorkload}`;
    return benchmarkResults[cacheKey] || null;
  };
  
  // Get variation configuration data
  const getVariationConfig = () => {
    if (!changedParameter || !parameterValue) return null;
    
    const key = `${selectedPreset}-${selectedWorkload}-${changedParameter}-${parameterValue}`;
    return parameterVariations[key] || null;
  };
  
  // Get selected workload info
  const getSelectedWorkloadInfo = () => {
    if (!workloadTypes || !selectedWorkload) return null;
    return workloadTypes.find(w => w.id === selectedWorkload);
  };
  
  return (
    <div className={styles.mainContainer}>
      {isLoadingConfigs ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>Loading experiment data...</div>
        </div>
      ) : (
        <>
          {/* Top Section: Configuration Selection */}
          <div className={styles.selectionSection}>
            <ConfigSelector 
              baseConfigs={baseConfigs}
              workloadTypes={workloadTypes}
              selectedPreset={selectedPreset}
              selectedWorkload={selectedWorkload}
              onPresetChange={setSelectedPreset}
              onWorkloadChange={setSelectedWorkload}
            />
          </div>
          
          {/* Middle Section: Parameter Impact Selection */}
          <div className={styles.parameterSection}>
            <h3 className={styles.sectionTitle}>Explore Parameter Impacts</h3>
            <p className={styles.sectionDescription}>
              Select a parameter below to see how changing it affects LSM Tree performance metrics.
              Each parameter change shows the real impact on performance for the {getSelectedWorkloadInfo()?.name.toLowerCase()} workload.
            </p>
            
            <ParameterSelector
              baseConfig={getCurrentConfig()}
              parameterOptions={parameterOptions}
              changedParameter={changedParameter}
              parameterValue={parameterValue}
              onParameterChange={handleParameterChange}
              isLoading={isLoadingResults}
            />
          </div>
          
          {/* Bottom Section: Results Display */}
          <div className={styles.resultsSection}>
            <ResultsPanel
              baseConfig={getCurrentConfig()}
              variationConfig={getVariationConfig()}
              workload={selectedWorkload}
              changedParameter={changedParameter}
              parameterValue={parameterValue}
            />
          </div>
          
          {/* Educational Content with collapsible explanation panel */}
          <ExplanationPanel
            selectedPreset={selectedPreset}
            selectedWorkload={selectedWorkload}
            changedParameter={changedParameter}
            parameterValue={parameterValue}
            isExpanded={showExplanations}
            onToggleExpand={handleToggleExplanations}
          />
        </>
      )}
    </div>
  );
};

export default LSMTreeExperiment;
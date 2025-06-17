import React, { useState, useRef, useEffect } from 'react';
import styles from './PdfParent.module.css';
import { Document, Page, pdfjs } from 'react-pdf/dist/esm/entry.webpack';
import SkeletonLoader from './SkeletonLoader';
import UploadResultTable from './UploadResultTable';
import SmartResultTable from './SmartResultTable';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const PdfParent = () => {
  // Store doc_id from API 1 for use in API 2
  const [docId, setDocId] = useState(null);
  const [activeTab, setActiveTab] = useState('pdf');
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [threshold, setThreshold] = useState('');
  const [maxIter, setMaxIter] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const pdfContainerRef = useRef(null);
  const [pdfScale, setPdfScale] = useState(1.3);
  const [pageHeight, setPageHeight] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [resultData, setResultData] = useState(null);
  const [expandedCells, setExpandedCells] = useState({});
  const [loading, setLoading] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [showUpload, setShowUpload] = useState(true);
  const [recentFiles, setRecentFiles] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [iterationData, setIterationData] = useState(null);
  const [iterationLoading, setIterationLoading] = useState(false);
  const [iterationError, setIterationError] = useState(null);
  const [iterationExpandedCells, setIterationExpandedCells] = useState({});
  const [currentIterationIdx, setCurrentIterationIdx] = useState(-1);
  const [iterationExpandAll, setIterationExpandAll] = useState(false);
  const iterationApiCalledRef = useRef({});

  const fileInputRef = useRef(null);


  useEffect(() => {
    if (pdfContainerRef.current) {
      const containerHeight = pdfContainerRef.current.offsetHeight;
      // Assume a typical PDF page height of 842px (A4 at 72dpi)
      const naturalPdfHeight = 842;
      const scale = Math.max(1, Math.min(containerHeight / naturalPdfHeight, 2));
      setPdfScale(scale);
      setPageHeight(containerHeight);
    }
  }, [submitted, pageNumber]);

  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'iter' && !iterationData) {
      setIterationLoading(true);
      setIterationError(null);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
    setSelectedFileName(f ? f.name : '');
  };

  const handleRecentFileClick = (fileObj) => {
    // Create a new File from the blob so the input can accept it
    const newFile = new File([fileObj.blob], fileObj.name, { type: 'application/pdf' });
    setFile(newFile);
    setFileUrl(URL.createObjectURL(newFile));
    setSelectedFileName(fileObj.name);
    setShowSidebar(false);
    setShowUpload(true);
    setSubmitted(false);
    setThreshold('');
    setMaxIter('');
    setResultData(null);
    // Update the file input element using DataTransfer
    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(newFile);
      fileInputRef.current.files = dataTransfer.files;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (file && threshold && maxIter) {
      setSubmitted(true);
      setPageNumber(1);
      setShowUpload(false);
      setLoading(true);
      setShowSidebar(false); // Ensure hamburger menu closes immediately on submit
      let apiResult = null;
      try {
        console.log('API CALLED: /upload_and_optimize');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('threshold', threshold);
        formData.append('max_iterations', maxIter);
        const res = await fetch('http://localhost:3001/upload_and_optimize'
        //   , {
        //   method: 'POST',
        //   body: formData
        // }
      );
        apiResult = await res.json();
        setDocId(apiResult.doc_id || null); // Store doc_id for API 2
        console.log('DATA RETURNED FROM /upload_and_optimize:', apiResult);
        // Transform API 1 response to contain only desired fields in the desired order/labels
        const transformed = {
          "Total Iterations": apiResult.iterations_run,
          "Threshold Reached": apiResult.threshold_reached,
          "Message": apiResult.message,
          "Extracted Data": apiResult.final_response_json
        };
        setResultData(transformed);
      } catch (err) {
        apiResult = { error: 'Failed to fetch data from API.' };
        setResultData(apiResult);
      }
      setLoading(false);
      // Update recent files: remove if already exists, then add to front, only store blob and name
      setRecentFiles(prev => {
        const filtered = prev.filter(fObj => fObj.name !== file.name);
        return [{ name: file.name, blob: file }, ...filtered];
      });
      setShowSidebar(false); // Hide sidebar after submit
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const nextPage = () => {
    if (pageNumber < numPages) setPageNumber(pageNumber + 1);
  };
  const prevPage = () => {
    if (pageNumber > 1) setPageNumber(pageNumber - 1);
  };

  const toggleExpand = (key) => {
    setExpandedCells((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  function collectAllExpandableKeys(data, parentKey = '') {
    let keys = [];
    if (!data) return keys;
    Object.entries(data).forEach(([key, value]) => {
      const cellKey = parentKey + key;
      const isLargeString = typeof value === 'string' && value.length > 60;
      const isLeaf = isLeafObject(value);
      if (isLeaf) {
        // Always add leaf object keys for expand/collapse, regardless of size
        keys.push(cellKey);
        // Also collect keys for all subfields in the leaf object
        Object.entries(value).forEach(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            keys = keys.concat(collectAllExpandableKeys(v, cellKey + '_leaf' + k));
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Always add non-leaf object keys for expand/collapse
        keys.push(cellKey);
        keys = keys.concat(collectAllExpandableKeys(value, cellKey));
      } else if (isLargeString) {
        keys.push(cellKey);
      }
    });
    return keys;
  }

  useEffect(() => {
    if (expandAll && resultData) {
      const allKeys = collectAllExpandableKeys(resultData);
      setExpandedCells(keys => {
        const newState = { ...keys };
        allKeys.forEach(k => { newState[k] = true; });
        return newState;
      });
    } else if (!expandAll && resultData) {
      const allKeys = collectAllExpandableKeys(resultData);
      setExpandedCells(keys => {
        const newState = { ...keys };
        allKeys.forEach(k => { newState[k] = false; });
        return newState;
      });
    }
  }, [expandAll, resultData]);

  // Collect all expandable keys for iteration data
  function collectAllIterationExpandableKeys(data, parentKey = '') {
    let keys = [];
    if (!data) return keys;
    Object.entries(data).forEach(([key, value]) => {
      const cellKey = parentKey + key;
      const isLargeString = typeof value === 'string' && value.length > 60;
      const isLeaf = isLeafObject(value);
      if (isLeaf) {
        keys.push(cellKey);
        Object.entries(value).forEach(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            keys = keys.concat(collectAllIterationExpandableKeys(v, cellKey + '_leaf' + k));
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        keys.push(cellKey);
        keys = keys.concat(collectAllIterationExpandableKeys(value, cellKey));
      } else if (isLargeString) {
        keys.push(cellKey);
      }
    });
    return keys;
  }

  useEffect(() => {
    if (iterationExpandAll && iterationData && iterationData[currentIterationIdx]) {
      const allKeys = collectAllIterationExpandableKeys(iterationData[currentIterationIdx]);
      setIterationExpandedCells(keys => {
        const newState = { ...keys };
        allKeys.forEach(k => { newState[k] = true; });
        return newState;
      });
    } else if (!iterationExpandAll && iterationData && iterationData[currentIterationIdx]) {
      const allKeys = collectAllIterationExpandableKeys(iterationData[currentIterationIdx]);
      setIterationExpandedCells(keys => {
        const newState = { ...keys };
        allKeys.forEach(k => { newState[k] = false; });
        return newState;
      });
    }
  }, [iterationExpandAll, iterationData, currentIterationIdx]);

  function renderTable(data, parentKey = '') {
    if (!data) return null;
    return (
      <table className={styles.resultTable}>
        <tbody>
          {Object.entries(data).map(([key, value]) => {
            const cellKey = parentKey + key;
            const isLargeString = typeof value === 'string' && value.length > 60;
            const isLeaf = isLeafObject(value);
            if (isLeaf) {
              // Leaf object: show expand/collapse if large, otherwise show as sub-table
              const str = JSON.stringify(value, null, 2);
              const isLarge = str.length > 80;
              return (
                <tr key={cellKey}>
                  <th>{key}</th>
                  <td>
                    {isLarge ? (
                      <>
                        {expandedCells[cellKey]
                          ? renderTable(value, cellKey + '_leaf')
                          : <div className={styles.expandedContent} style={{fontStyle:'italic',color:'#bfc7d5'}}>Click 'Expand' to see details</div>}
                        <button className={styles.expandBtn} onClick={() => toggleExpand(cellKey)}>
                          {expandedCells[cellKey] ? 'Collapse' : 'Expand'}
                        </button>
                      </>
                    ) : (
                      renderTable(value, cellKey + '_leaf')
                    )}
                  </td>
                </tr>
              );
            }
            if (typeof value === 'object' && value !== null) {
              // Non-leaf objects: always show as nested table
              return (
                <tr key={cellKey}>
                  <th>{key}</th>
                  <td>
                    {renderTable(value, cellKey)}
                  </td>
                </tr>
              );
            }
            if (isLargeString) {
              return (
                <tr key={cellKey}>
                  <th>{key}</th>
                  <td>
                    <span>
                      {expandedCells[cellKey] ? value : value.slice(0, 60) + '...'}
                    </span>
                    <button className={styles.expandBtn} onClick={() => toggleExpand(cellKey)}>
                      {expandedCells[cellKey] ? 'Collapse' : 'Expand'}
                    </button>
                  </td>
                </tr>
              );
            }
            return (
              <tr key={cellKey}>
                <th>{key}</th>
                <td>{value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  // Helper to check if an object is a leaf (all values are not objects or are arrays)
  function isLeafObject(obj) {
    if (typeof obj !== 'object' || obj === null) return false;
    return Object.values(obj).every(
      v => typeof v !== 'object' || v === null || Array.isArray(v)
    );
  }

  const handleBack = () => {
    setDocId(null); // Reset docId on back
    setShowUpload(true);
    setSubmitted(false);
    setFile(null);
    setFileUrl(null);
    setSelectedFileName('');
    setResultData(null);
    setThreshold('');
    setMaxIter('');
    setActiveTab('pdf'); // Ensure PDF tab is active after back
    setIterationData(null); // Reset iteration data on back
  };

  useEffect(() => {
    if (
      activeTab === 'iter' &&
      iterationLoading && // loader is set to true on tab switch
      !iterationData // Only call if not already loaded
    ) {
      setIterationError(null);
      console.log('API CALLED: /iterations');
      // fetch(`http://localhost:3001/iterations/${docId}`)
      fetch(`http://localhost:3001/iterations`)
        .then(res => res.json())
        .then(data => {
          console.log('DATA RETURNED FROM /iterations:', data);
          // Transform API 2 response array before storing in state
          const transformIteration = (item) => {
            const transformed = {
              'Iteration': item.iteration,
              'Score': item.score,
              'Extracted Data': item.extracted_json,
            };
            if (item.evaluation_data && typeof item.evaluation_data === 'object') {
              // Filter and rename fields in evaluation_data
              const evalData = {};
              Object.entries(item.evaluation_data).forEach(([k, v]) => {
                if (k === 'confidence_level' || k === 'overall_score') return; // exclude
                if (k === 'threshold_calculations') {
                  evalData['Critical Calculation'] = v;
                } else {
                  evalData[k] = v;
                }
              });
              transformed['Evaluation'] = evalData;
            }
            return transformed;
          };
          const transformedData = Array.isArray(data) ? data.map(transformIteration) : [];
          setIterationData(transformedData);
          setCurrentIterationIdx(-1); // All tabs collapsed by default
          setIterationLoading(false);
        })
        .catch(() => {
          setIterationData([]);
          setIterationError('Failed to fetch iteration data');
          setIterationLoading(false);
        });
    }
    // Remove resetting iterationData based on doc_id
  }, [activeTab, iterationLoading, iterationData]);

  // Reset iterationData on browser/tab close or refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      setIterationData(null);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  function renderIterationTable(data, parentKey = '') {
    console.log('renderIterationTable data:', data);
    if (!data) return null;
    return (
      <table className={styles.resultTable}>
        <tbody>
          {Object.entries(data).map(([key, value]) => {
            const cellKey = parentKey + key;
            const isLargeString = typeof value === 'string' && value.length > 60;
            const isLeaf = isLeafObject(value);
            if (isLeaf) {
              const str = JSON.stringify(value, null, 2);
              const isLarge = str.length > 80;
              return (
                <tr key={cellKey}>
                  <th>{key}</th>
                  <td>
                    {isLarge ? (
                      <>
                        {iterationExpandedCells[cellKey]
                          ? renderIterationTable(value, cellKey + '_leaf')
                          : <div className={styles.expandedContent} style={{fontStyle:'italic',color:'#bfc7d5'}}>Click 'Expand' to see details</div>}
                        <button className={styles.expandBtn} onClick={() => setIterationExpandedCells(prev => ({ ...prev, [cellKey]: !prev[cellKey] }))}>
                          {iterationExpandedCells[cellKey] ? 'Collapse' : 'Expand'}
                        </button>
                      </>
                    ) : (
                      renderIterationTable(value, cellKey + '_leaf')
                    )}
                  </td>
                </tr>
              );
            }
            if (typeof value === 'object' && value !== null) {
              return (
                <tr key={cellKey}>
                  <th>{key}</th>
                  <td>
                    {renderIterationTable(value, cellKey)}
                  </td>
                </tr>
              );
            }
            if (isLargeString) {
              return (
                <tr key={cellKey}>
                  <th>{key}</th>
                  <td>
                    <span>
                      {iterationExpandedCells[cellKey] ? value : value.slice(0, 60) + '...'}
                    </span>
                    <button className={styles.expandBtn} onClick={() => setIterationExpandedCells(prev => ({ ...prev, [cellKey]: !prev[cellKey] }))}>
                      {iterationExpandedCells[cellKey] ? 'Collapse' : 'Expand'}
                    </button>
                  </td>
                </tr>
              );
            }
            return (
              <tr key={cellKey}>
                <th>{key}</th>
                <td>{value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div className={styles.parentContainer}>
      {/* Hamburger menu */}
      {showUpload && (
        <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => setShowSidebar(s => !s)}
            aria-label="Show recent files"
          >
            <span style={{ display: 'inline-block', width: 32, height: 32 }}>
              <svg width="32" height="32" viewBox="0 0 32 32"><rect y="6" width="32" height="4" rx="2" fill="#7b5cff"/><rect y="14" width="32" height="4" rx="2" fill="#7b5cff"/><rect y="22" width="32" height="4" rx="2" fill="#7b5cff"/></svg>
            </span>
          </button>
          {showSidebar && (
            <div style={{ position: 'absolute', top: 40, left: 0, background: '#232a47', borderRadius: 12, boxShadow: '0 2px 16px rgba(60,140,231,0.18)', padding: 16, minWidth: 220, zIndex: 100 }}>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 12 }}>Recent Files</div>
              {recentFiles.length === 0 ? (
                <div style={{ color: '#bfc7d5', fontStyle: 'italic' }}>No recent files</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {recentFiles.map((fObj, idx) => (
                    <li key={fObj.name} style={{ marginBottom: 8 }}>
                      <button
                        style={{ background: 'none', border: 'none', color: '#7b5cff', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '1rem', borderRadius: 6, padding: '4px 8px', width: '100%' }}
                        onClick={() => { setShowSidebar(false); handleRecentFileClick(fObj); }}
                      >
                        {fObj.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      {/* Global Back Button */}
      {!showUpload && (
        <button
          onClick={handleBack}
          style={{ position: 'absolute', top: 24, right: 24, background: 'linear-gradient(90deg, #7b5cff 0%, #3c8ce7 100%)', color: '#fff', border: 'none', borderRadius: 24, padding: '8px 24px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', zIndex: 20, boxShadow: '0 2px 8px rgba(60,140,231,0.10)' }}
        >
          &#8592; Back
        </button>
      )}
      <div className={styles.tabs}>
        <button className={activeTab === 'pdf' ? styles.activeTab : ''} onClick={() => handleTab('pdf')}>PDF Viewer</button>
        <button
          className={activeTab === 'iter' ? styles.activeTab : ''}
          onClick={() => { if (resultData) handleTab('iter'); }}
          disabled={!resultData}
          style={!resultData ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          Iteration Info
        </button>
      </div>
      <div className={styles.tabContent}>
        {(loading || iterationLoading) && <SkeletonLoader /> }
        {showUpload ? (
          <form className={styles.uploadForm} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Upload PDF:</label>
              <div className={styles.customFileInputWrapper}>
                <input
                  type="file"
                  accept="application/pdf"
                  className={styles.customFileInput}
                  id="pdf-upload"
                  onChange={handleFileChange}
                  required
                  ref={fileInputRef}
                />
                <label htmlFor="pdf-upload" className={styles.customFileLabel}>
                  Choose File
                </label>
                <span className={styles.selectedFileName}>{selectedFileName || 'No file chosen'}</span>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Threshold:</label>
              <input
  type="number"
  value={threshold}
  min={0}
  max={100}
  step={0.01}
  placeholder="0 - 100"
  onChange={e => {
    let val = e.target.value;
    // Only allow numbers, up to two decimals, between 0 and 100
    if (val === '') {
      setThreshold('');
      return;
    }
    // Regex for up to 2 decimals
    if (/^\d{0,3}(\.\d{0,2})?$/.test(val)) {
      let num = parseFloat(val);
      if (num < 0) num = 0;
      if (num > 100) num = 100;
      // Keep at most two decimals
      val = num.toFixed(2);
      // Remove trailing zeros/decimal if not needed
      val = parseFloat(val).toString();
      setThreshold(val);
    }
  }}
  required
/>
            </div>
            <div className={styles.formGroup}>
              <label>Max Iterations:</label>
              <input
  type="number"
  value={maxIter}
  min={1}
  max={10}
  step={1}
  placeholder="1 - 10"
  onChange={e => {
    let val = e.target.value;
    // Only allow integers between 1 and 10
    if (val === '') {
      setMaxIter('');
      return;
    }
    if (/^\d{1,2}$/.test(val)) {
      let num = parseInt(val, 10);
      if (num < 1) num = 1;
      if (num > 10) num = 10;
      setMaxIter(num.toString());
    }
  }}
  required
/>
            </div>
            <button type="submit" className={styles.submitBtn}>Submit</button>
          </form>
        ) : (
          <div className={styles.splitContainer} style={{position:'relative'}}>

            <div className={styles.leftModal} ref={pdfContainerRef}>
                {/* Scrollable vertical PDF viewer */}
                {fileUrl && (
                  <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
                    {numPages && Array.from(new Array(numPages), (el, idx) => (
                      <Page
                        key={`page_${idx + 1}`}
                        pageNumber={idx + 1}
                        scale={pdfScale}
                        renderTextLayer={false}
                        loading={null}
                      />
                    ))}
                  </Document>
                )}
                
              </div>
            <div className={styles.rightModal}>
              
              {activeTab === 'pdf' ? (
                <>
                  {loading ? (
                    null
                  ) : resultData ? (
                    <div style={{width:'100%'}}>
                      <UploadResultTable resultData={resultData} />
                    </div>
                  ) : (
                    <div className={styles.wip}>work in progress</div>
                  )}
                </>
              ) : (
                <div className={styles.rightModal}>
                  {iterationLoading ? (
                    null
                  ) : iterationError ? (
                    <div style={{color:'red', fontWeight:700}}>{iterationError}</div>
                  ) : iterationData && iterationData.length > 0 ? (
                    <div className={styles.iterationTabsContainer}>
                      <div className={styles.iterationTabsHeader}>
                        {iterationData.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className={styles.iterationTab}
                          >
                            <div className={styles.iterationTabSummaryFlex} style={{cursor:'pointer'}} onClick={() => setCurrentIterationIdx(currentIterationIdx === idx ? -1 : idx)}>
                              <div className={styles.iterationTabLabel}>{`Iteration ${item.Iteration || item.iteration || ''}`}</div>
                              <span><span className={styles.summaryLabel}>Completeness:</span> <span className={styles.summaryValue}>{item.Evaluation?.category_scores?.completeness ?? '-'}{item.Evaluation?.category_scores?.completeness !== undefined ? '/25' : ''}</span></span>
                              <span><span className={styles.summaryLabel}>Data Accuracy:</span> <span className={styles.summaryValue}>{item.Evaluation?.category_scores?.data_accuracy ?? '-'}{item.Evaluation?.category_scores?.data_accuracy !== undefined ? '/60' : ''}</span></span>
                              <span><span className={styles.summaryLabel}>Schema Compliance:</span> <span className={styles.summaryValue}>{item.Evaluation?.category_scores?.schema_compliance ?? '-'}{item.Evaluation?.category_scores?.schema_compliance !== undefined ? '/15' : ''}</span></span>
                              <span><span className={styles.summaryLabel}>Score:</span> <span className={styles.summaryValue}>{item.Score ?? item.score ?? '-'}</span></span>
                              <button
                                className={styles.expandBtn}
                                onClick={e => { e.stopPropagation(); setCurrentIterationIdx(currentIterationIdx === idx ? -1 : idx); }}
                                aria-label="Expand iteration details"
                              >
                                {currentIterationIdx === idx ? '\u25b2' : '\u25bc'}
                              </button>
                            </div>
                            {currentIterationIdx === idx && (
                              <div className={styles.expandedIterationModal}>
                                <SmartResultTable data={item} title={`Iteration ${item.Iteration || item.iteration || ''}`} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.wip}>No iteration data</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default PdfParent;

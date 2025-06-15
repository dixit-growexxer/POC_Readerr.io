import React, { useState, useRef, useEffect } from 'react';
import styles from './PdfParent.module.css';
import { Document, Page, pdfjs } from 'react-pdf/dist/esm/entry.webpack';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const PdfParent = () => {
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
  const iterationApiCalledRef = useRef({});

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
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
    setSelectedFileName(f ? f.name : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (file && threshold && maxIter) {
      setSubmitted(true);
      setPageNumber(1);
      setShowUpload(false);
      setLoading(true);
      let apiResult = null;
      try {
        const res = await fetch('http://localhost:3001/upload_and_optimize');
        apiResult = await res.json();
        setResultData(apiResult);
      } catch (err) {
        apiResult = { error: 'Failed to fetch data from API.' };
        setResultData(apiResult);
      }
      setLoading(false);
      // Update recent files: remove if already exists, then add to front, and store result
      setRecentFiles(prev => {
        const filtered = prev.filter(fObj => fObj.name !== file.name);
        return [{ name: file.name, url: fileUrl, result: apiResult }, ...filtered];
      });
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
    setShowUpload(true);
    setSubmitted(false);
    setFile(null);
    setFileUrl(null);
    setSelectedFileName('');
    setResultData(null);
    setThreshold('');
    setMaxIter('');
  };

  const handleRecentFileClick = (fileObj) => {
    setFile({ name: fileObj.name });
    setFileUrl(fileObj.url);
    setSelectedFileName(fileObj.name);
    setShowUpload(false);
    setSubmitted(true);
    setPageNumber(1);
    setResultData(fileObj.result || null);
  };

  useEffect(() => {
    if (
      activeTab === 'iter' &&
      !iterationLoading &&
      !iterationData // Only call if not already loaded
    ) {
      setIterationLoading(true);
      setIterationError(null);
      fetch('http://localhost:3001/iterations')
        .then(res => res.json())
        .then(data => {
          setIterationData(Array.isArray(data) ? data : []);
          setIterationLoading(false);
        })
        .catch(() => {
          setIterationData([]);
          setIterationError('Failed to fetch iteration data');
          setIterationLoading(false);
        });
    }
    // If we switch to a new doc_id, reset iteration data
    if (resultData && resultData.doc_id && iterationData && iterationData.length > 0 && iterationData[0].doc_id !== resultData.doc_id) {
      setIterationData(null);
      setIterationExpandedCells({});
    }
  }, [activeTab, resultData, loading]);

  function renderIterationTable(data, parentKey = '') {
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
        <button className={activeTab === 'iter' ? styles.activeTab : ''} onClick={() => handleTab('iter')}>Iteration Info</button>
      </div>
      <div className={styles.tabContent}>
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
                />
                <label htmlFor="pdf-upload" className={styles.customFileLabel}>
                  Choose File
                </label>
                <span className={styles.selectedFileName}>{selectedFileName || 'No file chosen'}</span>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Threshold:</label>
              <input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label>Max Iterations:</label>
              <input type="number" value={maxIter} onChange={e => setMaxIter(e.target.value)} required />
            </div>
            <button type="submit" className={styles.submitBtn}>Submit</button>
          </form>
        ) : (
          <div className={styles.splitContainer}>
            <div className={styles.leftModal}>
              {/* PDF viewer always shown, regardless of tab */}
              {fileUrl && (
                <>
                  <div className={styles.pdfNavOverlay} style={{height: pageHeight}}>
                    <button className={styles.pdfNavButton} onClick={prevPage} disabled={pageNumber <= 1}>&lt;</button>
                    <button className={styles.pdfNavButton} onClick={nextPage} disabled={pageNumber >= numPages}>&gt;</button>
                  </div>
                  <div className={styles.pdfContainer} ref={pdfContainerRef}>
                    <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
                      <Page pageNumber={pageNumber} scale={pdfScale} renderTextLayer={false} />
                    </Document>
                  </div>
                </>
              )}
              <div className={styles.controls}>
                <button onClick={prevPage} disabled={pageNumber <= 1}>Previous</button>
                <span style={{margin: '0 10px'}}>Page {pageNumber} / {numPages}</span>
                <button onClick={nextPage} disabled={pageNumber >= numPages}>Next</button>
              </div>
            </div>
            <div className={styles.rightModal}>
              {activeTab === 'pdf' ? (
                <>
                  {loading ? (
                    <div style={{color:'#7b5cff', fontWeight:700, fontSize:'1.2rem'}}>Loading...</div>
                  ) : resultData ? (
                    <div style={{width:'100%'}}>
                      <div style={{flex:'0 0 auto', width:'100%', background:'transparent', display:'flex', justifyContent:'flex-end', alignItems:'center', padding:'8px 0 8px 0'}}>
                        <button
                          className={styles.expandBtn}
                          style={{
                            fontWeight: 700,
                            fontSize: '1.05rem',
                            background: '#232a47',
                            color: '#fff',
                            border: '1px solid #7b5cff',
                            borderRadius: 8,
                            padding: '8px 24px',
                            zIndex: 20,
                            boxShadow: '0 2px 8px rgba(60,140,231,0.10)',
                            marginRight: 8
                          }}
                          onClick={() => setExpandAll(val => !val)}
                        >
                          {expandAll ? 'Collapse All' : 'Expand All'}
                        </button>
                      </div>
                      {renderTable(resultData)}
                    </div>
                  ) : (
                    <div className={styles.wip}>work in progress</div>
                  )}
                </>
              ) : (
                <div className={styles.wip}>Iteration Info Tab (work in progress)</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfParent;

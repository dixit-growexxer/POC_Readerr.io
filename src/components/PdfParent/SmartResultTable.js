import React from "react";
import styles from "./PdfParent.module.css";

// Card and table styles reused from UploadResultTable
const cardStyle = {
  background: '#181e36',
  borderRadius: 14,
  boxShadow: '0 2px 18px rgba(60,140,231,0.10)',
  padding: '20px 28px',
  marginBottom: 28,
  width: '100%',
  maxWidth: 820,
  color: '#fff',
  boxSizing: 'border-box',
  alignSelf: 'center',
};
const tableScroll = {
  width: '100%',
  overflowX: 'auto',
};
const tableStyleAuto = {
  width: '100%',
  tableLayout: 'auto',
};
const cellStyle = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
const sectionHeaderStyle = {
  color: '#7b5cff',
  fontWeight: 700,
  fontSize: '1.18rem',
  marginBottom: 14,
  letterSpacing: 0.2,
};
const tableHeaderStyle = {
  background: '#232a47',
  color: '#bfc7d5',
  fontWeight: 600,
};

// Recursive key-value table renderer for nested objects/arrays
const renderKeyValueTable = (obj, indent = 0) => {
  if (obj === null) return <span style={{ fontStyle: 'italic', color: '#bfc7d5' }}>null</span>;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return <span style={{ fontStyle: 'italic', color: '#bfc7d5' }}>[]</span>;
    if (typeof obj[0] === 'object' && obj[0] !== null && !Array.isArray(obj[0])) {
      // Array of objects: render as sub-table
      const columns = Array.from(new Set(obj.flatMap(item => item && typeof item === 'object' ? Object.keys(item) : [])));
      return (
        <table className={styles.resultTable} style={tableStyleAuto}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={tableHeaderStyle}>{col.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {obj.map((item, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col} style={cellStyle}>
                    {typeof item?.[col] === 'object' && item?.[col] !== null
                      ? renderKeyValueTable(item[col], indent + 16)
                      : String(item?.[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else {
      // Array of primitives or mixed
      return obj.map((item, i) => (
        <span key={i}>
          {typeof item === 'object' && item !== null
            ? renderKeyValueTable(item, indent + 16)
            : String(item)}
          {i !== obj.length - 1 ? ', ' : ''}
        </span>
      ));
    }
  }
  if (typeof obj === 'object') {
    if (Object.keys(obj).length === 0) return <span style={{ fontStyle: 'italic', color: '#bfc7d5' }}>{'{}'}</span>;
    return (
      <table className={styles.resultTable} style={{ width: 'auto', marginBottom: 0, marginLeft: indent }}>
        <tbody>
          {Object.entries(obj).map(([key, value]) => (
            <tr key={key}>
              <th style={{ ...tableHeaderStyle, ...cellStyle }}>{key.replace(/_/g, ' ')}</th>
              <td style={cellStyle}>{renderKeyValueTable(value, indent + 16)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  // Primitive
  return <span>{String(obj)}</span>;
};

// Renders a card for each top-level field
const renderFieldsCard = (title, fields) => (
  <div style={cardStyle}>
    <div style={sectionHeaderStyle}>{title}</div>
    <div style={tableScroll}>
      {Object.entries(fields).map(([key, value]) => (
        <div key={key} style={{ marginBottom: 18 }}>
          <div
            style={{
              color: '#7b5cff',
              fontFamily: 'inherit',
              fontWeight: 800,
              fontSize: '1.35rem',
              margin: '30px 0 18px 0',
              paddingBottom: '6px',
              borderBottom: '2.5px solid #3c8ce7',
              letterSpacing: '0.5px',
              textTransform: 'capitalize',
              boxShadow: 'none',
              background: 'none',
              borderRadius: 0,
              display: 'block',
            }}
          >
            {key.replace(/_/g, ' ')}
          </div>
          {Array.isArray(value) && value.length && typeof value[0] === 'object' ? (
            <table className={styles.resultTable} style={tableStyleAuto}>
              <thead>
                <tr>
                  {Object.keys(value[0]).map(col => (
                    <th key={col} style={tableHeaderStyle}>{col.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.map((item, i) => (
                  <tr key={i}>
                    {Object.keys(value[0]).map(col => (
                      <td key={col} style={cellStyle}>{item[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : typeof value === 'object' && value !== null ? (
            renderKeyValueTable(value, 16)
          ) : (
            <div style={{ background: '#232a47', borderRadius: 6, padding: '4px 12px', color: '#fff', display: 'inline-block', minWidth: 80 }}>{String(value)}</div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Main component
const SmartResultTable = ({ data, title }) => {
  if (!data) return null;

  // Partition summary vs. nested fields
  const summaryFields = {};
  const nestedFields = {};
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      nestedFields[key] = value;
    } else {
      summaryFields[key] = value;
    }
  });

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {title && <div style={{ ...sectionHeaderStyle, fontSize: '1.5rem', marginBottom: 24 }}>{title}</div>}
      {/* Only render cards for nested fields (no summary) */}
      {Object.entries(nestedFields).map(([key, value]) => (
        renderFieldsCard(key.replace(/_/g, ' '), value)
      ))}
    </div>
  );
};

export default SmartResultTable;

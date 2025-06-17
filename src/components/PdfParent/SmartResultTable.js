import React from "react";
import styles from "./PdfParent.module.css";

// Helper to convert snake_case or space separated to Pascal Case (with spaces)
function pascalCase(str) {
  return String(str)
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


// Card and table styles reused from UploadResultTable
const cardStyle = {
  background: '#181e36',
  borderRadius: 14,
  boxShadow: '0 2px 18px rgba(60,140,231,0.10)',
  padding: '20px 28px',
  marginBottom: 28,
  width: '100%',
  color: '#fff',
  boxSizing: 'border-box',
  alignSelf: 'stretch',
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
                <th key={pascalCase(col)} style={tableHeaderStyle}>{pascalCase(col)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {obj.map((item, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={pascalCase(col)} style={cellStyle}>
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
            <tr key={pascalCase(key)}>
              <th style={{ ...tableHeaderStyle, ...cellStyle }}>{pascalCase(key)}</th>
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
const renderFieldsCard = (title, fields) => {
  // Custom order for Extracted Data card: Priority Fields, then Additional Fields, then others
  console.log('fields',fields);
  let orderedEntries = Object.entries(fields);
  if (pascalCase(title) === 'Extracted Data') {
    // Match keys case-insensitively
    const priorityIdx = orderedEntries.findIndex(([key]) => key.toLowerCase() === 'priority_fields'.toLowerCase());
    const additionalIdx = orderedEntries.findIndex(([key]) => key.toLowerCase() === 'additional_fields'.toLowerCase());
    const priority = priorityIdx !== -1 ? orderedEntries[priorityIdx] : undefined;
    const additional = additionalIdx !== -1 ? orderedEntries[additionalIdx] : undefined;
    const rest = orderedEntries.filter(([_key], idx) => idx !== priorityIdx && idx !== additionalIdx);
    orderedEntries = [];
    if (priority) orderedEntries.push(priority);
    if (additional) orderedEntries.push(additional);
    orderedEntries = orderedEntries.concat(rest);
  }
  return (
    <div style={cardStyle}>
      <div style={sectionHeaderStyle}>{pascalCase(title)}</div>
      <div style={tableScroll}>
        {orderedEntries.map(([key, value]) => (
          <div key={pascalCase(key)} style={{ marginBottom: 18 }}>
            <div
              style={{
                color: '#7b5cff',
                fontFamily: 'inherit',
                fontWeight: 800,
                fontSize: '1.35rem',
                margin: '30px 0 18px 0',
                paddingBottom: '6px',
                borderBottom: '2.5px solid #3c8ce7',
                letterSpacing: 0.5,
                textTransform: 'capitalize',
                boxShadow: 'none',
                background: 'none',
                borderRadius: 0,
                display: 'block',
              }}
            >
              {pascalCase(key)}
            </div>
            {Array.isArray(value) && value.length && typeof value[0] === 'object' ? (
              <table className={styles.resultTable} style={tableStyleAuto}>
                <thead>
                  <tr>
                    {Object.keys(value[0]).map(col => (
                      <th key={pascalCase(col)} style={tableHeaderStyle}>{pascalCase(col)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {value.map((item, i) => (
                    <tr key={i}>
                      {Object.keys(value[0]).map(col => (
                        <td key={pascalCase(col)} style={cellStyle}>{item[col]}</td>
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
};

// Main component
const SmartResultTable = ({ data, title }) => {
  console.log('data',data);
  // State for prompt expand/collapse (must be at top level for React rules)
  const [promptExpanded, setPromptExpanded] = React.useState(false);
  if (!data) return null;

  // Partition summary vs. nested fields
  const summaryFields = {};
  const nestedFields = {};
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'total_present_fields') return; // Exclude from summary
    if (typeof value === 'object' && value !== null) {
      nestedFields[key] = value;
    } else {
      summaryFields[key] = value;
    }
  });

  // Extract and remove Prompt Text if present
  const promptText = summaryFields['Prompt Text'];
  if ('Prompt Text' in summaryFields) {
    delete summaryFields['Prompt Text'];
  }
  // Remove Iteration and Score from summaryFields for expanded details
  if ('Iteration' in summaryFields) {
    delete summaryFields['Iteration'];
  }
  if ('Score' in summaryFields) {
    delete summaryFields['Score'];
  }

  // Helper to truncate prompt text
  function getTruncatedPrompt(text) {
    if (!text) return '';
    const lines = text.split(/\r?\n/);
    if (lines.length > 5) {
      return lines.slice(0, 5).join('\n') + '...';
    }
    if (text.length > 200) {
      return text.slice(0, 200) + '...';
    }
    return text;
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {title && <div style={{ ...sectionHeaderStyle, fontSize: '1.5rem', marginBottom: 24 }}>{pascalCase(title)}</div>}
      {/* Render summary fields as a table if any remain */}
      {Object.keys(summaryFields).length > 0 && (
        <div style={{ width: '100%', maxWidth: 820, marginBottom: 18 }}>
          <table className={styles.resultTable}>
            <tbody>
              {Object.entries(summaryFields).map(([key, value]) => (
                <tr key={key}>
                  <th style={{ ...tableHeaderStyle, ...cellStyle }}>{pascalCase(key)}</th>
                  <td style={cellStyle}>{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Only render cards for nested fields (no summary) */}
      {Object.entries(nestedFields).map(([key, value]) => (
        renderFieldsCard(key, value)
      ))}
      {promptText && (
        <div
          style={{
            background: '#232a47',
            color: '#bfc7d5',
            fontWeight: 600,
            fontSize: '1.13rem',
            marginTop: 22,
            padding: '16px 22px',
            borderRadius: 10,
            width: '100%',
            maxWidth: 820,
            boxSizing: 'border-box',
            whiteSpace: 'pre-line',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            overflowX: 'auto',
            boxShadow: '0 2px 12px rgba(60,140,231,0.10)',
            border: '1.5px solid #3c8ce7',
            letterSpacing: 0.01,
          }}
        >
          <span style={{ color: '#7b5cff', fontWeight: 800, fontSize: '1.18rem', display: 'block', marginBottom: 8 }}>Prompt Text</span>
          <span style={{whiteSpace: 'pre-line', wordBreak: 'break-word', overflowWrap: 'anywhere', display: 'block'}}>
            {promptExpanded ? promptText : getTruncatedPrompt(promptText)}
          </span>
          {(promptText.length > 200 || promptText.split(/\r?\n/).length > 5) && (
            <button
              style={{
                marginTop: 10,
                background: 'none',
                border: 'none',
                color: '#7b5cff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '1rem',
                padding: 0,
                textDecoration: 'underline',
              }}
              onClick={() => setPromptExpanded(v => !v)}
            >
              {promptExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartResultTable;

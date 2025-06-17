import React from "react";
import styles from "./PdfParent.module.css";

// Helper to convert snake_case or space separated to PascalCase
function pascalCase(str) {
  return String(str)
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


// Recursive row renderer
const renderRows = (data, level = 0) => {
  if (!data || typeof data !== 'object') return null;
  return Object.entries(data).map(([key, value], idx) => {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      // Array of objects: render as sub-table
      const columns = Object.keys(value[0]);
      return (
        <React.Fragment key={key + idx}>
          <tr>
            <th style={{ paddingLeft: 16 * level, fontWeight: 600, background: level === 0 ? '#232a47' : undefined, color: '#bfc7d5' }} colSpan={2}>{pascalCase(key)}</th>
          </tr>
          <tr>
            <td colSpan={2} style={{ paddingLeft: 16 * (level + 1), background: '#181e36' }}>
              <table className={styles.resultTable} style={{ margin: 0, width: '100%' }}>
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={pascalCase(col)} style={{ color: '#bfc7d5', fontWeight: 500 }}>{pascalCase(col)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {value.map((item, i) => (
                    <tr key={i}>
                      {columns.map(col => (
                        <td key={pascalCase(col)}>{item[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </React.Fragment>
      );
    } else if (typeof value === 'object' && value !== null) {
      // Nested object: render recursively
      return (
        <React.Fragment key={key + idx}>
          <tr>
            <th style={{ paddingLeft: 16 * level, fontWeight: 600, background: level === 0 ? '#232a47' : undefined, color: '#bfc7d5' }}>{pascalCase(key)}</th>
            <td></td>
          </tr>
          {renderRows(value, level + 1)}
        </React.Fragment>
      );
    } else {
      // Primitive value
      return (
        <tr key={key + idx}>
          <th style={{ paddingLeft: 16 * level, fontWeight: 500, background: level === 0 ? '#232a47' : undefined, color: '#bfc7d5' }}>{pascalCase(key)}</th>
          <td>{String(value)}</td>
        </tr>
      );
    }
  });
};

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
  // No maxWidth, no wordBreak
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

const renderSummary = (data) => (
  <div style={cardStyle}>
    <div style={sectionHeaderStyle}>Summary</div>
    <table className={styles.resultTable} style={{ marginBottom: 0 }}>
      <tbody>
        {Object.entries(data).map(([key, value]) =>
          typeof value !== 'object' || value === null ? (
            <tr key={key}>
              <th style={tableHeaderStyle}>{pascalCase(key)}</th>
              <td>{String(value)}</td>
            </tr>
          ) : null
        )}
      </tbody>
    </table>
  </div>
);

const renderKeyValueTable = (obj, indent = 0) => (
  <table className={styles.resultTable} style={{ width: 'auto', marginBottom: 0, marginLeft: indent }}>
    <tbody>
      {Object.entries(obj).map(([key, value]) => (
        <tr key={key}>
          <th style={{ ...tableHeaderStyle, ...cellStyle }}>{pascalCase(key)}</th>
          <td style={cellStyle}>
            {Array.isArray(value)
              ? (value.length && typeof value[0] === 'object'
                  ? (
                    <table className={styles.resultTable} style={tableStyleAuto}>
                      <thead>
                        <tr>
                          {Object.keys(value[0]).map(col => (
                            <th key={pascalCase(col)} style={cellStyle}>{pascalCase(col)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {value.map((item, i) => (
                          <tr key={i}>
                            {Object.keys(value[0]).map(col => (
                              <td key={pascalCase(col)} style={cellStyle}>{typeof item[col] === 'object' && item[col] !== null ? renderKeyValueTable(item[col], indent + 16) : String(item[col])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                  : value.length > 0
                    ? value.map((item, i) => (
                        <span key={i}>{typeof item === 'object' && item !== null ? renderKeyValueTable(item, indent + 16) : String(item)}{i !== value.length - 1 ? ', ' : ''}</span>
                      ))
                    : <span>[]</span>)
              : typeof value === 'object' && value !== null
                ? renderKeyValueTable(value, indent + 16)
                : String(value)
            }
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const renderFieldsCard = (title, fields) => {
  // Always show Priority Fields before Additional Fields, then others
  let orderedEntries = Object.entries(fields);
  const priorityIdx = orderedEntries.findIndex(([key]) => key.toLowerCase() === 'priority_fields');
  const additionalIdx = orderedEntries.findIndex(([key]) => key.toLowerCase() === 'additional_fields');
  const priority = priorityIdx !== -1 ? orderedEntries[priorityIdx] : undefined;
  const additional = additionalIdx !== -1 ? orderedEntries[additionalIdx] : undefined;
  const rest = orderedEntries.filter(([_key], idx) => idx !== priorityIdx && idx !== additionalIdx);
  orderedEntries = [];
  if (priority) orderedEntries.push(priority);
  if (additional) orderedEntries.push(additional);
  orderedEntries = orderedEntries.concat(rest);
  return (
    <div style={cardStyle}>
      <div style={sectionHeaderStyle}>{pascalCase(title)}</div>
      <div style={tableScroll}>
        {orderedEntries.map(([key, value]) => (
          <div key={key} style={{ marginBottom: 18 }}>
            <div
              style={{
                color: '#7b5cff',
                fontFamily: 'inherit', // use app's main font
                fontWeight: 800,
                fontSize: '1.35rem',
                margin: '30px 0 18px 0',
                paddingBottom: '6px',
                borderBottom: '2.5px solid #3c8ce7',
              }}
            >
              {pascalCase(key)}
            </div>
            {Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' ? (
              <table className={styles.resultTable} style={tableStyleAuto}>
                <thead>
                  <tr>
                    {Object.keys(value[0]).map(col => (
                      <th key={pascalCase(col)} style={cellStyle}>{pascalCase(col)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {value.map((item, idx) => (
                    <tr key={idx}>
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

const UploadResultTable = ({ resultData }) => {
  if (!resultData) return null;

  // Partition summary vs. nested fields
  const summaryFields = {};
  const nestedFields = {};
  Object.entries(resultData).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      nestedFields[key] = value;
    } else {
      summaryFields[key] = value;
    }
  });

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {Object.keys(summaryFields).length > 0 && renderSummary(summaryFields)}
      {nestedFields['Priority Fields'] && renderFieldsCard('Priority Fields', nestedFields['Priority Fields'])}
      {nestedFields['Extracted Data'] && renderFieldsCard('Extracted Data', nestedFields['Extracted Data'])}
      {nestedFields['Additional Fields'] && renderFieldsCard('Additional Fields', nestedFields['Additional Fields'])}
      {/* Fallback: render any other nested fields */}
      {Object.entries(nestedFields).map(([key, value]) => (
        !['Priority Fields', 'Extracted Data', 'Additional Fields'].includes(key) && renderFieldsCard(pascalCase(key), value)
      ))}
    </div>
  );
};

export default UploadResultTable;

import React from 'react';
import ReactDOM from 'react-dom';
import styles from './PdfParent.module.css';

const SkeletonLoader = ({ className = '' }) =>
  ReactDOM.createPortal(
    <div className={`${styles.skeletonOverlay} ${className}`}>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonBar} style={{ width: '60%' }} />
        <div className={styles.skeletonBar} style={{ width: '90%' }} />
        <div className={styles.skeletonBar} style={{ width: '80%' }} />
        <div className={styles.skeletonBar} style={{ width: '70%' }} />
        <div className={styles.skeletonBar} style={{ width: '50%' }} />
      </div>
    </div>,
    document.body
  );

export default SkeletonLoader;

import React from 'react';
import styles from './PdfParent.module.css';

const SkeletonLoader = ({ className = '' }) => {
  return (
    <div className={`${styles.skeletonOverlay} ${className}`}>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonBar} style={{ width: '60%' }} />
        <div className={styles.skeletonBar} style={{ width: '90%' }} />
        <div className={styles.skeletonBar} style={{ width: '80%' }} />
        <div className={styles.skeletonBar} style={{ width: '70%' }} />
        <div className={styles.skeletonBar} style={{ width: '50%' }} />
      </div>
    </div>
  );
};

export default SkeletonLoader;

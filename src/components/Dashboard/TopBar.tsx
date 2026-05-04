'use client';

import { useState } from 'react';
import styles from './TopBar.module.css';

export default function TopBar() {
  const [live, setLive] = useState(true);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <span className={styles.label}>Service</span>
        <select className={styles.select} defaultValue="watchtower">
          <option value="watchtower">watchtower</option>
        </select>
      </div>

      <div className={styles.right}>
        <select className={styles.select} defaultValue="1h">
          <option value="15m">Last 15m</option>
          <option value="1h">Last 1h</option>
          <option value="6h">Last 6h</option>
          <option value="24h">Last 24h</option>
          <option value="72h">Last 72h</option>
        </select>

        <button className={`${styles.live} ${live ? styles.on : ''}`} onClick={() => setLive((v) => !v)}>
          {live ? 'Live' : 'Paused'}
        </button>
      </div>
    </header>
  );
}

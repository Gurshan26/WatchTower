'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/traces', label: 'Traces' },
  { href: '/dashboard/logs', label: 'Logs' },
  { href: '/dashboard/metrics', label: 'Metrics' },
  { href: '/dashboard/errors', label: 'Errors' },
  { href: '/dashboard/chaos', label: 'Chaos' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>WatchTower</div>
      <nav className={styles.nav}>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={`${styles.link} ${active ? styles.active : ''}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.healthBlock}>
        <div className={styles.healthHeader}>System Health</div>
        <svg width="120" height="72" viewBox="0 0 120 72" className={styles.gauge}>
          <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="#1e293b" strokeWidth="10" />
          <path
            d="M10 62 A50 50 0 0 1 110 62"
            fill="none"
            stroke="#10b981"
            strokeWidth="10"
            strokeDasharray="157"
            strokeDashoffset="24"
            className={styles.arc}
          />
        </svg>
        <div className={styles.healthScore}>93</div>
      </div>
    </aside>
  );
}

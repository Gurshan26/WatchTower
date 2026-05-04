import Sidebar from '@/components/Dashboard/Sidebar';
import TopBar from '@/components/Dashboard/TopBar';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isVercel = process.env.VERCEL === '1';

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <TopBar />
        {isVercel && (
          <div className={styles.banner}>
            Using ephemeral storage on Vercel. Data resets between sessions.
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}

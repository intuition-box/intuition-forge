import { Routes, Route, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { BatchPage } from "@/pages/BatchPage";
import { HealthPage } from "@/pages/HealthPage";
import styles from "@/styles/layout.module.css";

const PAGE_TITLES: Record<string, string> = {
  "/": "Batch Import",
  "/health": "Health",
};

export function App() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? "Intuition Forge";

  return (
    <div className={styles.appLayout}>
      <Sidebar />
      <main className={styles.mainContent}>
        <TopBar title={title} />
        <div className={styles.pageContent}>
          <Routes>
            <Route path="/" element={<BatchPage />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

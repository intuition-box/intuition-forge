import { Routes, Route, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { OverviewPage } from "@/pages/OverviewPage";
import { AtomsPage } from "@/pages/AtomsPage";
import { TriplesPage } from "@/pages/TriplesPage";
import { BatchPage } from "@/pages/BatchPage";
import { HealthPage } from "@/pages/HealthPage";
import styles from "@/styles/layout.module.css";

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/atoms": "Atoms",
  "/triples": "Triples",
  "/batch": "Batch Operations",
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
            <Route path="/" element={<OverviewPage />} />
            <Route path="/atoms" element={<AtomsPage />} />
            <Route path="/triples" element={<TriplesPage />} />
            <Route path="/batch" element={<BatchPage />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

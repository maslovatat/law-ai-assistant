import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./CaseStore";
import { AppShell } from "./AppShell";
import { LandingPage } from "../pages/LandingPage";
import { UserCasesPage } from "../pages/UserCasesPage";
import { NewCasePage } from "../pages/NewCasePage";
import { UserCasePage } from "../pages/UserCasePage";
import { LawyerQueuePage } from "../pages/LawyerQueuePage";
import { LawyerCasePage } from "../pages/LawyerCasePage";
import { NotFoundPage } from "../pages/NotFoundPage";

export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/cases" element={<UserCasesPage />} />
            <Route path="/cases/new" element={<NewCasePage />} />
            <Route path="/cases/:caseId" element={<UserCasePage />} />
            <Route path="/lawyer" element={<Navigate to="/lawyer/queue" replace />} />
            <Route path="/lawyer/queue" element={<LawyerQueuePage />} />
            <Route path="/lawyer/cases/:caseId" element={<LawyerCasePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </StoreProvider>
  );
}
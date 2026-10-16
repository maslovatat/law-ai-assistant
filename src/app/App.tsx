import { HashRouter, Route, Routes } from "react-router-dom";
import { ShipmentStoreProvider } from "./ShipmentStore";
import { AppShell } from "./AppShell";
import { DashboardPage } from "../pages/DashboardPage";
import { CreateShipmentPage } from "../pages/CreateShipmentPage";
import { ShipmentsPage } from "../pages/ShipmentsPage";
import { ShipmentDetailsPage } from "../pages/ShipmentDetailsPage";
import { DraftsPage } from "../pages/DraftsPage";
import { ProfilePage } from "../pages/ProfilePage";
import { NotFoundPage } from "../pages/NotFoundPage";

export function App() {
  return (
    <ShipmentStoreProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/create" element={<CreateShipmentPage />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
            <Route path="/shipments/:id" element={<ShipmentDetailsPage />} />
            <Route path="/drafts" element={<DraftsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </ShipmentStoreProvider>
  );
}

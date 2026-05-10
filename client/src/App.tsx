import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import ClinicDashboard from "./pages/ClinicDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LandingPage from "./pages/LandingPage";
import PatientDashboard from "./pages/PatientDashboard";
import Appointments from "./pages/Appointments";
import AppointmentDetails from "./pages/AppointmentDetails";
import Billing from "./pages/Billing";
import Inventory from "./pages/Inventory";
import ReceiptDetails from "./pages/ReceiptDetails";
import Reports from "./pages/Reports";
import "./App.css";

const getDefaultPath = (role?: string) => {
  if (role === "admin") return "/admin";
  if (role === "clinic" || role === "clinic_owner") return "/clinic";
  if (role === "doctor" || role === "receptionist") return "/appointments";
  if (role === "patient") return "/patient";
  return "/";
};

const RequireAuth = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Array<
    "admin" | "clinic_owner" | "clinic" | "doctor" | "receptionist" | "patient"
  >;
}) => {
  const { token, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-gradient">
        <div className="rounded-2xl bg-white/80 px-6 py-4 text-sm text-slate-600 shadow">
          Loading workspace...
        </div>
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }
  if (location.pathname === "/") {
    return <Navigate to={getDefaultPath(user?.role)} replace />;
  }
  return <>{children}</>;
};

const PublicOnly = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoading, user } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-gradient">
        <div className="rounded-2xl bg-white/80 px-6 py-4 text-sm text-slate-600 shadow">
          Loading workspace...
        </div>
      </div>
    );
  }
  if (token) {
    return <Navigate to={getDefaultPath(user?.role)} replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnly>
              <LandingPage />
            </PublicOnly>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth allowedRoles={["admin"]}>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/clinic"
          element={
            <RequireAuth allowedRoles={["clinic_owner", "clinic"]}>
              <ClinicDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/patient"
          element={
            <RequireAuth allowedRoles={["patient"]}>
              <PatientDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/appointments"
          element={
            <RequireAuth
              allowedRoles={[
                "admin",
                "clinic_owner",
                "clinic",
                "doctor",
                "receptionist",
                "patient",
              ]}
            >
              <Appointments />
            </RequireAuth>
          }
        />
        <Route
          path="/appointments/:id"
          element={
            <RequireAuth
              allowedRoles={[
                "admin",
                "clinic_owner",
                "clinic",
                "doctor",
                "receptionist",
                "patient",
              ]}
            >
              <AppointmentDetails />
            </RequireAuth>
          }
        />
        <Route
          path="/billing"
          element={
            <RequireAuth
              allowedRoles={["admin", "clinic_owner", "clinic", "doctor", "receptionist"]}
            >
              <Billing />
            </RequireAuth>
          }
        />
        <Route
          path="/inventory"
          element={
            <RequireAuth
              allowedRoles={["admin", "clinic_owner", "clinic", "doctor", "receptionist"]}
            >
              <Inventory />
            </RequireAuth>
          }
        />
        <Route
          path="/billing/receipts/:id"
          element={
            <RequireAuth
              allowedRoles={[
                "admin",
                "clinic_owner",
                "clinic",
                "doctor",
                "receptionist",
                "patient",
              ]}
            >
              <ReceiptDetails />
            </RequireAuth>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireAuth
              allowedRoles={["admin", "clinic_owner", "clinic", "doctor", "receptionist"]}
            >
              <Reports />
            </RequireAuth>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnly>
              <Register />
            </PublicOnly>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;

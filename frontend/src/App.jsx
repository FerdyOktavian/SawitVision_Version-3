import { useEffect, useState } from "react";

import AppHeader from "./components/AppHeader";
import BottomNav from "./components/BottomNav";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PredictionPage from "./pages/PredictionPage";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";

import {
  clearAuthSession,
  getCurrentUser,
  getStoredUser,
} from "./services/api";

import "./styles/global.css";
import "./styles/auth.css";
import "./styles/home.css";
import "./styles/navigation.css";
import "./styles/prediction.css";
import "./styles/history.css";
import "./styles/profile.css";
import "./styles/about.css";
import "./styles/admin.css";

const ACTIVE_PAGE_KEY = "sawitvision_v3_active_page";

const VALID_PAGES = [
  "home",
  "prediction",
  "history",
  "profile",
  "about",
  "admin",
];

function getInitialActivePage() {
  const savedPage = localStorage.getItem(ACTIVE_PAGE_KEY);

  if (savedPage && VALID_PAGES.includes(savedPage)) {
    return savedPage;
  }

  return "home";
}

function App() {
  const [authPage, setAuthPage] = useState("login");

  const [activePage, setActivePage] = useState(() => getInitialActivePage());

  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // =====================================================
  // CEK SESSION SAAT APP PERTAMA DIBUKA / REFRESH
  // =====================================================
  useEffect(() => {
    const checkSession = async () => {
      const storedUser = getStoredUser();

      if (!storedUser) {
        setCurrentUser(null);
        setIsCheckingSession(false);

        localStorage.removeItem(ACTIVE_PAGE_KEY);

        return;
      }

      try {
        const response = await getCurrentUser();

        // Aman untuk dua kemungkinan response:
        // { user: {...} }
        // atau langsung {...}
        const freshUser = response?.user || response;

        setCurrentUser(freshUser);

        // Kalau page terakhir admin,
        // tapi user sekarang bukan admin,
        // paksa kembali ke home.
        const savedPage = localStorage.getItem(ACTIVE_PAGE_KEY);

        if (savedPage === "admin" && freshUser?.role !== "admin") {
          setActivePage("home");

          localStorage.setItem(ACTIVE_PAGE_KEY, "home");
        }
      } catch (error) {
        clearAuthSession();

        localStorage.removeItem(ACTIVE_PAGE_KEY);

        setCurrentUser(null);
        setActivePage("home");
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  // =====================================================
  // NAVIGASI
  // =====================================================
  const handleNavigate = (pageName) => {
    if (!VALID_PAGES.includes(pageName)) {
      return;
    }

    // Proteksi tambahan frontend admin.
    if (pageName === "admin" && currentUser?.role !== "admin") {
      setActivePage("home");

      localStorage.setItem(ACTIVE_PAGE_KEY, "home");

      return;
    }

    setActivePage(pageName);

    localStorage.setItem(ACTIVE_PAGE_KEY, pageName);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  };

  // =====================================================
  // LOGIN
  // =====================================================
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);

    setActivePage("home");

    localStorage.setItem(ACTIVE_PAGE_KEY, "home");
  };

  // =====================================================
  // REGISTER
  // =====================================================
  const handleRegisterSuccess = () => {
    setAuthPage("login");
  };

  // =====================================================
  // LOGOUT
  // =====================================================
  const handleLogout = () => {
    clearAuthSession();

    localStorage.removeItem(ACTIVE_PAGE_KEY);

    setCurrentUser(null);
    setActivePage("home");
    setAuthPage("login");
  };

  // =====================================================
  // RENDER PAGE
  // =====================================================
  const renderActivePage = () => {
    if (activePage === "home") {
      return (
        <HomePage
          currentUser={currentUser}
          onStartPrediction={() => handleNavigate("prediction")}
          onOpenHistory={() => handleNavigate("history")}
        />
      );
    }

    if (activePage === "prediction") {
      return <PredictionPage onOpenHistory={() => handleNavigate("history")} />;
    }

    if (activePage === "history") {
      return (
        <HistoryPage
          currentUser={currentUser}
          onStartPrediction={() => handleNavigate("prediction")}
        />
      );
    }

    if (activePage === "profile") {
      return (
        <ProfilePage
          currentUser={currentUser}
          onUserUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
          }}
          onLogout={handleLogout}
        />
      );
    }

    if (activePage === "about") {
      return (
        <AboutPage
          currentUser={currentUser}
          onStartPrediction={() => handleNavigate("prediction")}
          onOpenHistory={() => handleNavigate("history")}
        />
      );
    }

    if (activePage === "admin" && currentUser?.role === "admin") {
      return <AdminDashboardPage currentUser={currentUser} />;
    }

    return (
      <HomePage
        currentUser={currentUser}
        onStartPrediction={() => handleNavigate("prediction")}
        onOpenHistory={() => handleNavigate("history")}
      />
    );
  };

  // =====================================================
  // LOADING SESSION
  // =====================================================
  if (isCheckingSession) {
    return (
      <main className="app-loading-page">
        <div className="app-loading-card">
          <div className="app-loading-logo">🌴</div>

          <h1>SawitVision V3</h1>

          <p>Memeriksa sesi pengguna...</p>

          <div className="app-loading-spinner" />
        </div>
      </main>
    );
  }

  // =====================================================
  // BELUM LOGIN
  // =====================================================
  if (!currentUser) {
    if (authPage === "register") {
      return (
        <RegisterPage
          onGoToLogin={() => setAuthPage("login")}
          onRegisterSuccess={handleRegisterSuccess}
        />
      );
    }

    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onGoToRegister={() => setAuthPage("register")}
      />
    );
  }

  // =====================================================
  // SUDAH LOGIN
  // =====================================================
  return (
    <div className="app-shell">
      <AppHeader currentUser={currentUser} onNavigate={handleNavigate} />

      {renderActivePage()}

      <BottomNav
        activePage={activePage}
        onNavigate={handleNavigate}
        currentUser={currentUser}
      />
    </div>
  );
}

export default App;

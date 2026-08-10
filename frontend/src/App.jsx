import { useEffect, useState } from "react";

import AppHeader from "./components/AppHeader";
import BottomNav from "./components/BottomNav";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PredictionPage from "./pages/PredictionPage";
import "./styles/prediction.css";
import HistoryPage from "./pages/HistoryPage";
import "./styles/history.css";
import ProfilePage from "./pages/ProfilePage";
import "./styles/profile.css";
import AboutPage from "./pages/AboutPage";
import "./styles/about.css";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import "./styles/admin.css";
import {
  clearAuthSession,
  getCurrentUser,
  getStoredUser,
} from "./services/api";

import "./styles/global.css";
import "./styles/auth.css";
import "./styles/home.css";
import "./styles/navigation.css";

function App() {
  const [authPage, setAuthPage] = useState("login");
  const [activePage, setActivePage] = useState("home");

  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const storedUser = getStoredUser();

      if (!storedUser) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        setCurrentUser(response.user);
      } catch {
        clearAuthSession();
        setCurrentUser(null);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleNavigate = (pageName) => {
    setActivePage(pageName);
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActivePage("home");
  };

  const handleRegisterSuccess = () => {
    setAuthPage("login");
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setActivePage("home");
    setAuthPage("login");
  };

  
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
          onLogout={() => {
            setCurrentUser(null);
            setActivePage("home");
          }}
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

    if (activePage === "admin") {
      return <AdminDashboardPage currentUser={currentUser} />;
    }
    
    
  };

  
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
  return (
    <div className="app-shell">
      <AppHeader currentUser={currentUser} onNavigate={handleNavigate} />

      {renderActivePage()}

      <BottomNav
        activePage={activePage}
        onNavigate={handleNavigate}
        currentUser={currentUser}
      />

      {activePage === "profile" && (
        <button
          type="button"
          className="temporary-logout-button"
          onClick={handleLogout}
          style={{
            width: "min(calc(100% - 32px), 728px)",
            display: "block",
            margin: "0 auto 24px",
          }}
        >
          Keluar dari akun
        </button>
      )}
    </div>
  );
}

export default App;

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { PreparePage } from './pages/PreparePage';
import { LivePage } from './pages/LivePage';
import { ReflectPage } from './pages/ReflectPage';
import { JourneyLogPage } from './pages/JourneyLogPage';
import { PrayerPage } from './pages/PrayerPage';
import { ArchivePage } from './pages/ArchivePage';
import { GuidePage } from './pages/GuidePage';
import { AssessmentPage } from './pages/AssessmentPage';
import { ServingAssessmentPage } from './pages/ServingAssessmentPage';
import { ProfileSelectPage } from './pages/ProfileSelectPage';
import './styles/global.css';
import './components/illustrations/FieldGuideArt.css';
import './components/layout/AppShell.css';
import './components/layout/SideNav.css';
import './pages/HomePage.css';
import './components/home/TrailContinueCta.css';
import './components/home/FirstWeekChecklist.css';
import './pages/JourneyLogPage.css';
import './pages/PrayerPage.css';
import './pages/ArchivePage.css';
import './pages/GuidePage.css';
import './pages/AssessmentPage.css';
import './pages/ProfileSelectPage.css';

function AppRoutes() {
  const { activeProfile } = useProfile();

  if (!activeProfile) {
    return (
      <Routes>
        <Route path="*" element={<ProfileSelectPage />} />
      </Routes>
    );
  }

  return (
    <AppProvider profileId={activeProfile.id} key={activeProfile.id}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/profiles" element={<ProfileSelectPage switching />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/prepare" element={<PreparePage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/reflect" element={<ReflectPage />} />
          <Route path="/journal" element={<JourneyLogPage />} />
          <Route path="/prayer" element={<PrayerPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/serving" element={<ServingAssessmentPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ProfileProvider>
  );
}

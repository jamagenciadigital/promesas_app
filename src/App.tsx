import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import DashboardLayout from './components/Layout/DashboardLayout';

import Login from './pages/Auth/Login';
import RegisterClub from './pages/Auth/RegisterClub';
import RegisterPlayer from './pages/Public/RegisterPlayer';
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';
import AthleteList from './pages/SuperAdmin/AthleteList';
import ClubList from './pages/SuperAdmin/ClubList';
import ClubAdmins from './pages/SuperAdmin/ClubAdmins';
import SuperAdminPlanes from './pages/SuperAdmin/SuperAdminPlanes';

import FriendlyMatches from './pages/Club/Games/FriendlyMatches';
import BasketballScorekeeper from './pages/Club/Games/Basketball/BasketballScorekeeper';
import SportsConfig from './pages/SuperAdmin/SportsConfig';
import ClubDashboard from './pages/Club/ClubDashboard';
import ClubSettings from './pages/Club/Settings/ClubSettings';
import Equipos from './pages/Club/Equipos';
import TeamDashboard from './pages/Club/TeamDashboard';
import PlayerProfile from './pages/Club/PlayerProfile';
import Entrenadores from './pages/Club/Entrenadores';
import CoachProfile from './pages/Club/CoachProfile';
import Calendar from './pages/Club/Calendar';
import Cartera from './pages/Club/Cartera';
import CarteraDetails from './pages/Club/CarteraDetails';
import Planning from './pages/Club/Planning';
import CoordinatorDashboard from './pages/Coordinator/CoordinatorDashboard';
import CoachDashboard from './pages/Coach/CoachDashboard';
import Profile from './pages/Profile/Profile';
import PlayerReservations from './pages/Player/PlayerReservations';
import ClubNewReservation from './pages/Club/ClubNewReservation';
import ClubReservations from './pages/Club/ClubReservations';
import PlayerDashboard from './pages/Player/PlayerDashboard';
import PlayerCartera from './pages/Player/PlayerCartera';
import PlayerCalendar from './pages/Player/PlayerCalendar';
import PlayerMyProfile from './pages/Player/PlayerMyProfile';
import PlayerNewReservation from './pages/Player/PlayerNewReservation';
import RegisterParent from './pages/Public/RegisterParent';
import EscenarioDashboard from './pages/Escenario/EscenarioDashboard';
import JefaturaDashboard from './pages/Jefatura/JefaturaDashboard';

import DireccionDeportiva from './pages/Club/Pro/DireccionDeportiva';
import RegisterElitePlayer from './pages/Club/RegisterElitePlayer';
import PublicReservation from './pages/Escenario/PublicReservation';
import PlayerPQRS from './pages/Player/PlayerPQRS';
import ClubPQRS from './pages/Club/ClubPQRS';
import EscenarioPQRS from './pages/Escenario/EscenarioPQRS';
import CoachPQRS from './pages/Coach/CoachPQRS';
import InventoryDashboard from './pages/Logistica/InventoryDashboard';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider>
        <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro-club" element={<RegisterClub />} />
          <Route path="/registro-deportista" element={<RegisterPlayer />} />
          <Route path="/registro-padre" element={<RegisterParent />} />
          <Route path="/reservar/:id" element={<PublicReservation />} />
          
          {/* Protected Routes by Role */}
          {/* SUPERADMIN DASHBOARD */}
          <Route path="/superadmin/*" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<SuperAdminDashboard />} />
                  <Route path="jugadores" element={<AthleteList />} />
                  <Route path="clubes" element={<ClubList />} />
                  <Route path="usuarios-club" element={<ClubAdmins />} />
                  <Route path="escenarios" element={<EscenarioDashboard />} />
                  <Route path="planes" element={<SuperAdminPlanes />} />
                  <Route path="settings" element={<SportsConfig />} />
                  <Route path="*" element={<Navigate to="/superadmin" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* CLUB ADMIN DASHBOARD */}
          <Route path="/club/*" element={
            <ProtectedRoute allowedRoles={['admin_club', 'superadmin']}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<ClubDashboard />} />
                  <Route path="teams" element={<Equipos />} />
                  <Route path="teams/:id" element={<TeamDashboard />} />
                  <Route path="teams/:id/register-player" element={<RegisterElitePlayer />} />
                  <Route path="players/:id" element={<PlayerProfile />} />
                  <Route path="coaches" element={<Entrenadores />} />
                  <Route path="coaches/:id" element={<CoachProfile />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="reservations" element={<ClubReservations />} />
                  <Route path="reservations/new" element={<ClubNewReservation />} />
                  <Route path="planning" element={<Planning />} />
                  <Route path="finance" element={<Cartera />} />
                  <Route path="finance/:id" element={<CarteraDetails />} />
                  <Route path="pro/direccion" element={<DireccionDeportiva />} />
                  <Route path="games" element={<FriendlyMatches />} />
                  <Route path="games/:id/score/basketball" element={<BasketballScorekeeper />} />
                  <Route path="pqrs" element={<ClubPQRS />} />
                  <Route path="logistica" element={<InventoryDashboard />} />
                  <Route path="settings" element={<ClubSettings />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* COORDINATOR DASHBOARD */}
          <Route path="/coordinator/*" element={
            <ProtectedRoute allowedRoles={['admin_equipo', 'superadmin']}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<CoordinatorDashboard />} />
                  <Route path="teams" element={<CoordinatorDashboard />} />
                  <Route path="teams/:id" element={<TeamDashboard />} />
                  <Route path="players/:id" element={<PlayerProfile />} />
                  <Route path="reservations" element={<ClubReservations />} />
                  <Route path="reservations/new" element={<ClubNewReservation />} />
                  <Route path="pqrs" element={<ClubPQRS />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* COACH DASHBOARD */}
          <Route path="/coach/*" element={
            <ProtectedRoute allowedRoles={['entrenador', 'superadmin']}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<CoachDashboard />} />
                  <Route path="teams/:id" element={<TeamDashboard />} />
                  <Route path="players/:id" element={<PlayerProfile />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="planning" element={<Planning />} />
                  <Route path="reservations" element={<ClubReservations />} />
                  <Route path="reservations/new" element={<ClubNewReservation />} />
                  <Route path="games" element={<FriendlyMatches />} />
                  <Route path="games/:id/score/basketball" element={<BasketballScorekeeper />} />
                  <Route path="pqrs" element={<CoachPQRS />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* ESCENARIO DEPORTIVO DASHBOARD - NUEVO ROL VINCULADO */}
          <Route path="/escenario/*" element={
            <ProtectedRoute allowedRoles={['escenario_deportivo', 'admin_escenario', 'superadmin', 'admin_club']}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<EscenarioDashboard />} />
                  <Route path="/reservas" element={<EscenarioDashboard defaultView="reservations" />} />
                  <Route path="/config" element={<EscenarioDashboard defaultView="list" />} />
                  <Route path="/settings" element={<EscenarioDashboard defaultView="settings" />} />
                  <Route path="/pqrs" element={<EscenarioPQRS />} />
                  <Route path="/logistica" element={<InventoryDashboard />} />
                  <Route path="*" element={<Navigate to="/escenario" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* PLAYER/PARENT DASHBOARD */}
          <Route path="/player/*" element={
            <ProtectedRoute allowedRoles={['padre']}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<PlayerDashboard />} />
                  <Route path="profile" element={<PlayerMyProfile />} />
                  <Route path="finance" element={<PlayerCartera />} />
                  <Route path="calendar" element={<PlayerCalendar />} />
                  <Route path="reservations" element={<PlayerReservations />} />
                  <Route path="reservations/new" element={<PlayerNewReservation />} />
                  <Route path="pqrs" element={<PlayerPQRS />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* JEFATURA DASHBOARD - NUEVO ROL */}
          <Route path="/jefatura/*" element={
            <ProtectedRoute allowedRoles={['jefatura', 'superadmin']}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<JefaturaDashboard />} />
                  <Route path="venues" element={<JefaturaDashboard defaultTab="venues" />} />
                  <Route path="assignments" element={<JefaturaDashboard defaultTab="assignments" />} />
                  <Route path="*" element={<Navigate to="/jefatura" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* SPORTS DIRECTOR DASHBOARD */}
          <Route path="/sports-dir/*" element={
            <ProtectedRoute allowedRoles={['direccion_deportiva']}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<DireccionDeportiva />} />
                  <Route path="teams" element={<Equipos />} />
                  <Route path="teams/:id" element={<TeamDashboard />} />
                  <Route path="teams/:id/register-player" element={<RegisterElitePlayer />} />
                  <Route path="players/:id" element={<PlayerProfile />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="planning" element={<Planning />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Profile Route for all logged in users */}
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin_club', 'admin_equipo', 'entrenador', 'cartera', 'padre', 'direccion_deportiva', 'admin_escenario', 'escenario_deportivo', 'jefatura']}>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </ThemeProvider>
    </AuthProvider>
  </LanguageProvider>
  );
}

export default App;

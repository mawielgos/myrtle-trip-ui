import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import TripsPage from "../pages/TripsPage";
import TripDetailPage from "../pages/TripDetailPage";
import TripCreatePage from "../pages/TripCreatePage";
import TripRoundPlanningPage from "../pages/TripRoundPlanningPage";
import RoundEntryRedirectPage from "../pages/RoundEntryRedirectPage";
import RoundGroupsPage from "../pages/RoundGroupsPage";
import RoundSetupStatusPage from "../pages/RoundSetupStatusPage";
import RoundTeamAssignmentPage from "../pages/RoundTeamAssignmentPage";
import RoundScoringPage from "../pages/RoundScoringPage";
import RoundResultsPage from "../pages/RoundResultsPage";
import RoundSetupPage from "../pages/RoundSetupPage";
import CourseAdminPage from "../pages/CourseAdminPage";
import CourseAdminEditPage from "../pages/CourseAdminEditPage";
import CourseTeeEditPage from "../pages/CourseTeeEditPage";
import PlayerAdminPage from "../pages/PlayerAdminPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/trips" replace />} />

        <Route element={<AppShell />}>
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/new" element={<TripCreatePage />} />
          <Route path="/trips/:tripId/edit" element={<TripCreatePage />} />
          <Route path="/trips/:tripId" element={<TripDetailPage />} />
          <Route
            path="/trips/:tripId/planned-rounds"
            element={<TripRoundPlanningPage />}
          />
          <Route path="/trips/:tripId/rounds/new" element={<RoundSetupPage />} />

          <Route path="/rounds/:roundId" element={<RoundSetupStatusPage />} />
          <Route path="/rounds/:roundId/open" element={<RoundEntryRedirectPage />} />
          <Route path="/rounds/:roundId/groups" element={<RoundGroupsPage />} />
          <Route path="/rounds/:roundId/teams" element={<RoundTeamAssignmentPage />} />
          <Route path="/rounds/:roundId/scoring" element={<RoundScoringPage />} />
          <Route path="/rounds/:roundId/results" element={<RoundResultsPage />} />

          <Route path="/admin/courses" element={<CourseAdminPage />} />
          <Route path="/admin/courses/new" element={<CourseAdminEditPage />} />
          <Route path="/admin/courses/:courseId" element={<CourseAdminEditPage />} />
          <Route path="/admin/courses/:courseId/tees/new" element={<CourseTeeEditPage />} />
          <Route path="/admin/courses/:courseId/tees/:teeId" element={<CourseTeeEditPage />} />

          <Route path="/admin/players" element={<PlayerAdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
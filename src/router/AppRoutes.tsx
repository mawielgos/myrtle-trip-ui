import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import ScrollToTop from "../components/common/ScrollToTop";
import TripsPage from "../pages/TripsPage";
import TripDetailPage from "../pages/TripDetailPage";
import TripCreatePage from "../pages/TripCreatePage";
import TripRoundPlanningPage from "../pages/TripRoundPlanningPage";
import TripTournamentSetupPage from "../pages/TripTournamentSetupPage";
import TripGhinFixesPage from "../pages/TripGhinFixesPage";
import TournamentStandingsPage from "../pages/TournamentStandingsPage";
import StrokesPerDayPage from "../pages/StrokesPerDayPage";
import HandicapCardsPage from "../pages/HandicapCardsPage";
import HandicapCardPage from "../pages/HandicapCardPage";
import TripPrizeSetupPage from "../pages/TripPrizeSetupPage";
import TripWinningDetailPage from "../pages/TripWinningDetailPage";
import TripReportsPage from "../pages/TripReportsPage";
import TripMoneyDistributionPage from "../pages/TripMoneyDistributionPage";
import RoundEntryRedirectPage from "../pages/RoundEntryRedirectPage";
import RoundGroupsPage from "../pages/RoundGroupsPage";
import RoundSetupStatusPage from "../pages/RoundSetupStatusPage";
import RoundTeamAssignmentPage from "../pages/RoundTeamAssignmentPage";
import RoundScoringPage from "../pages/RoundScoringPage";
import RoundResultsPage from "../pages/RoundResultsPage";
import RoundTeeSheetPage from "../pages/RoundTeeSheetPage";
import RoundSetupPage from "../pages/RoundSetupPage";
import CourseAdminPage from "../pages/CourseAdminPage";
import CourseAdminEditPage from "../pages/CourseAdminEditPage";
import CourseTeeEditPage from "../pages/CourseTeeEditPage";
import PlayerAdminPage from "../pages/PlayerAdminPage";
import PlayerEditPage from "../pages/PlayerEditPage";
import TripManualScoreHistoryPage from "../pages/TripManualScoreHistoryPage";
import TripPlayerMaintenancePage from "../pages/TripPlayerMaintenancePage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/trips" replace />} />

        <Route element={<AppShell />}>
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/new" element={<TripCreatePage />} />
          <Route path="/trips/:tripId/edit" element={<TripCreatePage />} />
          <Route path="/trips/:tripId" element={<TripDetailPage />} />
          <Route path="/trips/:tripId/players" element={<TripPlayerMaintenancePage />} />
          <Route
            path="/trips/:tripId/planned-rounds"
            element={<TripRoundPlanningPage />}
          />
          <Route
            path="/trips/:tripId/tournament-setup"
            element={<TripTournamentSetupPage />}
          />
          <Route path="/trips/:tripId/ghin-fixes" element={<TripGhinFixesPage />} />
          <Route
            path="/trips/:tripId/manual-score-history"
            element={<TripManualScoreHistoryPage />}
          />
          <Route
            path="/trips/:tripId/tournament-standings"
            element={<TournamentStandingsPage />}
          />
          <Route
            path="/trips/:tripId/four-day-standings"
            element={<TournamentStandingsPage />}
          />
          <Route
            path="/trips/:tripId/strokes-per-day"
            element={<StrokesPerDayPage />}
          />
          <Route
            path="/trips/:tripId/handicap-cards"
            element={<HandicapCardsPage />}
          />
          <Route
            path="/trips/:tripId/handicap-cards/players/:playerId"
            element={<HandicapCardPage />}
          />
          <Route
            path="/trips/:tripId/prizes"
            element={<TripPrizeSetupPage />}
          />
          <Route
            path="/trips/:tripId/reports"
            element={<TripReportsPage />}
          />
          <Route
            path="/trips/:tripId/winning-detail"
            element={<TripWinningDetailPage />}
          />
          <Route
            path="/trips/:tripId/money-distribution"
            element={<TripMoneyDistributionPage />}
          />
          <Route path="/trips/:tripId/rounds/new" element={<RoundSetupPage />} />

          <Route path="/rounds/:roundId" element={<RoundSetupStatusPage />} />
          <Route path="/rounds/:roundId/open" element={<RoundEntryRedirectPage />} />
          <Route path="/rounds/:roundId/groups" element={<RoundGroupsPage />} />
          <Route path="/rounds/:roundId/tee-sheet" element={<RoundTeeSheetPage />} />
          <Route path="/rounds/:roundId/teams" element={<RoundTeamAssignmentPage />} />
          <Route path="/rounds/:roundId/scoring" element={<RoundScoringPage />} />
          <Route path="/rounds/:roundId/results" element={<RoundResultsPage />} />

          <Route path="/admin/courses" element={<CourseAdminPage />} />
          <Route path="/admin/courses/new" element={<CourseAdminEditPage />} />
          <Route path="/admin/courses/:courseId" element={<CourseAdminEditPage />} />
          <Route
            path="/admin/courses/:courseId/tees/new"
            element={<CourseTeeEditPage />}
          />
          <Route
            path="/admin/courses/:courseId/tees/:teeId"
            element={<CourseTeeEditPage />}
          />

          <Route path="/admin/players" element={<PlayerAdminPage />} />
          <Route path="/admin/players/new" element={<PlayerEditPage />} />
          <Route path="/admin/players/:playerId" element={<PlayerEditPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

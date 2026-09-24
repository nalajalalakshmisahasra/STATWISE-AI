import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useApp } from './lib/app-context.jsx'
import { Spinner } from './components/ui.jsx'
import { WorkspaceShell } from './components/layout.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'

import LearnerDashboard from './pages/learner/Dashboard.jsx'
import LearnerProfile from './pages/learner/Profile.jsx'
import Assessment from './pages/learner/Assessment.jsx'
import Gaps from './pages/learner/Gaps.jsx'
import Recommendations from './pages/learner/Recommendations.jsx'
import Activities from './pages/learner/Activities.jsx'
import ActivityDetail from './pages/learner/ActivityDetail.jsx'
import LearnerQuizzes from './pages/learner/Quizzes.jsx'
import QuizTake from './pages/learner/QuizTake.jsx'
import Assistant from './pages/learner/Assistant.jsx'
import Progress from './pages/learner/Progress.jsx'

import TrainerDashboard from './pages/trainer/Dashboard.jsx'
import TrainerLearners from './pages/trainer/Learners.jsx'
import TrainerLearnerDetail from './pages/trainer/LearnerDetail.jsx'
import CohortAnalysis from './pages/trainer/Cohort.jsx'
import QuizReview from './pages/trainer/QuizReview.jsx'
import TrainerQuizzes from './pages/trainer/TrainerQuizzes.jsx'

import AdminAnalytics from './pages/admin/Analytics.jsx'
import AdminResources from './pages/admin/Resources.jsx'
import AdminFramework from './pages/admin/Framework.jsx'
import AdminUsers from './pages/admin/Users.jsx'
import AdminIntegrations from './pages/admin/Integrations.jsx'

function Guard ({ role, children }) {
  const { user } = useApp()
  const location = useLocation()
  if (user === undefined) return <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><Spinner /></div>
  if (!user || user.role !== role) return <Navigate to="/login" state={{ from: location }} replace />
  return <WorkspaceShell role={role}>{children}</WorkspaceShell>
}

export default function App () {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route path="/learner" element={<Guard role="learner"><LearnerDashboard /></Guard>} />
      <Route path="/learner/profile" element={<Guard role="learner"><LearnerProfile /></Guard>} />
      <Route path="/learner/assessment" element={<Guard role="learner"><Assessment /></Guard>} />
      <Route path="/learner/gaps" element={<Guard role="learner"><Gaps /></Guard>} />
      <Route path="/learner/recommendations" element={<Guard role="learner"><Recommendations /></Guard>} />
      <Route path="/learner/activities" element={<Guard role="learner"><Activities /></Guard>} />
      <Route path="/learner/activities/:id" element={<Guard role="learner"><ActivityDetail /></Guard>} />
      <Route path="/learner/quizzes" element={<Guard role="learner"><LearnerQuizzes /></Guard>} />
      <Route path="/learner/quizzes/:id" element={<Guard role="learner"><QuizTake /></Guard>} />
      <Route path="/learner/assistant" element={<Guard role="learner"><Assistant /></Guard>} />
      <Route path="/learner/progress" element={<Guard role="learner"><Progress /></Guard>} />

      <Route path="/trainer" element={<Guard role="trainer"><TrainerDashboard /></Guard>} />
      <Route path="/trainer/learners" element={<Guard role="trainer"><TrainerLearners /></Guard>} />
      <Route path="/trainer/learners/:id" element={<Guard role="trainer"><TrainerLearnerDetail /></Guard>} />
      <Route path="/trainer/cohort" element={<Guard role="trainer"><CohortAnalysis /></Guard>} />
      <Route path="/trainer/review" element={<Guard role="trainer"><QuizReview /></Guard>} />
      <Route path="/trainer/review/:id" element={<Guard role="trainer"><QuizReview /></Guard>} />
      <Route path="/trainer/quizzes" element={<Guard role="trainer"><TrainerQuizzes /></Guard>} />

      <Route path="/admin" element={<Guard role="admin"><AdminAnalytics /></Guard>} />
      <Route path="/admin/resources" element={<Guard role="admin"><AdminResources /></Guard>} />
      <Route path="/admin/framework" element={<Guard role="admin"><AdminFramework /></Guard>} />
      <Route path="/admin/users" element={<Guard role="admin"><AdminUsers /></Guard>} />
      <Route path="/admin/integrations" element={<Guard role="admin"><AdminIntegrations /></Guard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { NewRepoPage } from '@/pages/NewRepoPage'
import {
  RepoLayout,
  RepoCodePage,
  RepoIssuesPage,
  RepoPullsPage,
  RepoSettingsPage,
  RepoCommitsPage,
  RepoReleasesPage,
} from '@/pages/RepoPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SearchPage } from '@/pages/SearchPage'
import {
  SettingsLayout,
  SettingsProfilePage,
  SettingsAppearancePage,
  SettingsPlaceholder,
} from '@/pages/SettingsPage'
import {
  AdminLayout,
  AdminOverviewPage,
  AdminUsersPage,
  AdminReposPage,
  AdminSettingsPage,
  AdminAuditPage,
} from '@/pages/AdminPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="explore" element={<DashboardPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="new" element={<NewRepoPage />} />
        <Route path="notifications" element={<DashboardPage />} />

        <Route path="settings" element={<SettingsLayout />}>
          <Route path="profile" element={<SettingsProfilePage />} />
          <Route path="appearance" element={<SettingsAppearancePage />} />
          <Route path="account" element={<SettingsPlaceholder title="Account" />} />
          <Route path="ssh-keys" element={<SettingsPlaceholder title="SSH keys" />} />
          <Route path="tokens" element={<SettingsPlaceholder title="Personal access tokens" />} />
        </Route>

        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="repositories" element={<AdminReposPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>

        <Route path=":owner/:repo" element={<RepoLayout />}>
          <Route index element={<RepoCodePage />} />
          <Route path="issues" element={<RepoIssuesPage />} />
          <Route path="pulls" element={<RepoPullsPage />} />
          <Route path="releases" element={<RepoReleasesPage />} />
          <Route path="settings" element={<RepoSettingsPage />} />
          <Route path="commits" element={<RepoCommitsPage />} />
          <Route path="branches" element={<RepoCommitsPage />} />
          <Route path="commit/:sha" element={<RepoCommitsPage />} />
          <Route path="blob/:ref/*" element={<RepoCodePage />} />
        </Route>

        <Route path=":username" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}

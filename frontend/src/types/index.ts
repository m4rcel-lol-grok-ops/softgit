export interface User {
  id: string
  username: string
  email: string
  display_name: string
  bio?: string
  avatar_url?: string
  website?: string
  location?: string
  is_admin: boolean
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
  last_login_at?: string
}

export interface Repository {
  id: string
  owner_id: string
  owner_type: 'user' | 'organization'
  owner_name: string
  name: string
  full_name: string
  description?: string
  visibility: 'public' | 'private' | 'internal'
  default_branch: string
  is_fork: boolean
  forked_from_id?: string
  stars_count: number
  watchers_count: number
  forks_count: number
  open_issues_count: number
  size: number
  topics?: string[]
  archived: boolean
  disabled: boolean
  created_at: string
  updated_at: string
  pushed_at?: string
}

export interface CommitInfo {
  sha: string
  author: string
  email: string
  date: string
  subject: string
}

export interface TreeEntry {
  mode: string
  type: string
  sha: string
  path: string
}

export interface Issue {
  id: string
  repository_id: string
  number: number
  title: string
  body?: string
  state: 'open' | 'closed'
  author_id: string
  author?: User
  assignees?: string[]
  labels?: Label[]
  milestone_id?: string
  locked: boolean
  comments_count: number
  created_at: string
  updated_at: string
  closed_at?: string
}

export interface Label {
  id: string
  repository_id: string
  name: string
  color: string
  description?: string
  created_at: string
}

export interface PullRequest {
  id: string
  repository_id: string
  number: number
  title: string
  body?: string
  state: 'open' | 'closed' | 'merged'
  author_id: string
  author?: User
  head_ref: string
  base_ref: string
  head_sha: string
  base_sha: string
  draft: boolean
  merged: boolean
  mergeable?: boolean
  merge_commit_sha?: string
  merged_at?: string
  comments_count: number
  commits_count: number
  additions: number
  deletions: number
  changed_files: number
  created_at: string
  updated_at: string
}

export interface Release {
  id: string
  repository_id: string
  tag_name: string
  name: string
  body?: string
  draft: boolean
  prerelease: boolean
  author_id: string
  author?: User
  target_commitish: string
  created_at: string
  published_at?: string
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

export interface LoginResponse {
  token: string
  expires_at: string
  user: User
}

export interface Branch {
  name: string
}

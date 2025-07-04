// src/types/roles.ts

export type TicketType =
  | 'volume_shortfall'
  | 'high_rejections'
  | 'no_interviews'
  | 'profile_data_issue'
  | 'credential_issue'
  | 'bulk_complaints'
  | 'early_application_request'
  | 'resume_update'
  | 'job_feed_empty'
  | 'system_technical_failure'
  | 'am_not_responding'

export type UserRole =
  | 'client'
  | 'sales'
  | 'account_manager'
  | 'career_associate'
  | 'ca_team_lead'
  | 'resume_team'
  | 'scraping_team'
  | 'credential_resolution'
  | 'cro'
  | 'cro_manager'
  | 'coo'
  | 'ceo'
  | 'system_admin'

export interface RolePermissions {
  canCreateTickets: TicketType[]
  canViewTickets: boolean
  canEditTickets: boolean
  canResolveTickets: boolean
  canEscalateTickets: boolean
  canViewClients: boolean
  canManageUsers: boolean
  canViewReports: boolean
  canOnboardClients: boolean
}

import {
  LayoutDashboard, MessageSquare, KeyRound, Users, Code2,
  Webhook, BarChart3, CreditCard, Settings,
} from 'lucide-react'
import type { NavItem } from '../types/navigation'

export const navItems: NavItem[] = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, description: 'Your account at a glance.' },
  { label: 'Messages', path: '/messages', icon: MessageSquare, description: 'Submit message requests and review API status records.' },
  { label: 'API Keys', path: '/api-keys', icon: KeyRound, description: 'Create and manage the keys your applications use to call OpenSMS.' },
  { label: 'Contacts', path: '/contacts', icon: Users, description: 'Organize recipients and manage opt-outs.' },
  { label: 'Developers', path: '/developers', icon: Code2, description: 'API reference, quickstarts, and code samples.' },
  { label: 'Webhooks', path: '/webhooks', icon: Webhook, description: 'Configure event subscriptions for your HTTPS endpoints.' },
  { label: 'Usage & Analytics', path: '/analytics', icon: BarChart3, description: 'Track message volume and delivery performance over time.' },
  { label: 'Billing', path: '/billing', icon: CreditCard, description: 'Manage your plan, balance, and invoices.' },
  { label: 'Settings', path: '/settings', icon: Settings, description: 'View authenticated tenant account information.' },
]

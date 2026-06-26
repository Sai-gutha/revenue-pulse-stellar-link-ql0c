# Daily Market Revenue & AUM Analyzer

## 1. Overview
A scheduled agentic app that automatically scrapes market sources for revenue and AUM data each business day, computes variances and trends versus prior snapshots, then delivers a live dashboard, an emailed report, a Slack summary, and a downloadable PDF/Excel artifact — all without manual entry. Historical snapshots are persisted so you can browse, filter, and compare days over time.

## 2. User Stories
- As a finance lead, I want the daily revenue & AUM analysis to run automatically every morning so I never have to chase the data myself.
- As an analyst, I want to see today's KPIs and the variance vs. yesterday on a dashboard so I can spot anomalies in seconds.
- As a distribution owner, I want the report auto-emailed to my list and posted to Slack so stakeholders are always informed.
- As a portfolio manager, I want a downloadable PDF/Excel of the daily snapshot so I can share it externally or archive it.
- As a reviewer, I want to browse and compare past daily snapshots so I can track trends over weeks and months.

## 3.a. Agent Architecture

**Pattern:** Hybrid — Manager-Subagent (analysis pipeline) + Independent Agents (distribution actions)

**Reasoning:** The daily analysis is a one-shot pipeline (scrape multiple sources + compute analytics together → single snapshot), best modeled as Manager + Subs. The distribution actions (Email, Slack, Generate Report) each need their own trigger so you can re-send or regenerate ad-hoc — Independent Agents fit that.

**Agent Flow:**
The Daily Analysis Pipeline runs automatically on a scheduled trigger (every business day morning) AND from a "Run Analysis Now" button on the Dashboard. The Daily Revenue Coordinator manages two sub-agents — the Market Data Scraper pulls latest revenue/AUM figures from public market feeds, while the Revenue & AUM Analyzer computes variance vs. the prior snapshot, identifies trends, and produces a structured analysis. The snapshot is persisted to MongoDB. After analysis, three Independent agents are available as CTAs on the Snapshot Detail screen: "Generate Report" (PDF/Excel), "Email Distribution List" (Gmail), and "Post to Slack". On schedule, all three fire automatically once analysis completes.

**Data Sources Detected:** 1 — Public market feeds via web search (Claude native search)

**Agents Table:**
| Agent Type | Agent Name | Description | Tools/Data Sources | Trigger | Provider | Model | Temperature | Top_p |
|---|---|---|---|---|---|---|---|---|
| Manager | Daily Revenue Coordinator | Orchestrates daily scrape + analysis, aggregates the snapshot and persists it | N/A | Scheduled: Daily 8 AM + "Run Analysis Now" on Dashboard | Anthropic | anthropic/claude-sonnet-4-6 | 0.2 | 1 |
| Sub-Agent | Market Data Scraper | Searches public market feeds for latest revenue and AUM figures using Claude native web search | Web search (Claude native) | Auto (via Manager) | Anthropic | anthropic/claude-sonnet-4-6 | 0.2 | 1 |
| Sub-Agent | Revenue & AUM Analyzer | Computes variance vs. prior snapshot, trends, anomalies, and structured KPIs | N/A | Auto (via Manager) | Anthropic | anthropic/claude-sonnet-4-6 | 0.3 | 1 |
| Independent | Report Generator Agent | Generates polished PDF and Excel daily reports from the snapshot | N/A (file output) | "Generate Report" on Snapshot Detail + Auto after scheduled run | Anthropic | anthropic/claude-sonnet-4-6 | 0.3 | 1 |
| Independent | Email Distribution Agent | Emails the formatted daily report to the configured distribution list | gmail | "Email Report" on Snapshot Detail + Auto after scheduled run | Anthropic | anthropic/claude-sonnet-4-6 | 0.2 | 1 |
| Independent | Slack Summary Agent | Posts a concise KPI + variance summary to the configured Slack channel | slack | "Post to Slack" on Snapshot Detail + Auto after scheduled run | Anthropic | anthropic/claude-sonnet-4-6 | 0.3 | 1 |

**Workflow Visualization:**
The Input Node sits at the far left. The Daily Revenue Coordinator connects to the right of the Input Node. Directly below the Coordinator, two sub-agents (Market Data Scraper and Revenue & AUM Analyzer) sit in a horizontal row at the same vertical level; the Coordinator connects downward to both. To the right of the Coordinator (at the Coordinator's level), the three Independent agents — Report Generator, Email Distribution, and Slack Summary — sit in a horizontal row, each available as a separate CTA-driven node.

## 3.d. File Output Configuration
| Agent Name | Use Case | Output Format(s) |
|---|---|---|
| Report Generator Agent | Daily revenue & AUM snapshot report with KPIs, variance tables, and trend chart | PDF, XLSX |

## 3.f. Scheduler Configuration
| Agent Name | Frequency | Trigger Time | Description |
|---|---|---|---|
| Daily Revenue Coordinator | Daily (business days) | User configurable (default 8:00 AM local) | Runs full analysis pipeline; on completion, auto-triggers Report Generator, Email Distribution, and Slack Summary agents |

## 3.g. Database Configuration

**Database:** MongoDB (Built-in Lyzr Studio database)

**User Management:** Required — email/password signup + login; all screens gated behind auth.

| Collection | Purpose | Key Fields |
|---|---|---|
| users | User accounts and roles | id, email, password_hash, name, role, created_at |
| daily_snapshots | One persisted snapshot per business day | id, owner_user_id, snapshot_date, total_revenue, aum, revenue_variance_pct, aum_variance_pct, top_movers, anomalies, raw_sources, created_at |
| reports | Generated PDF/Excel report metadata | id, owner_user_id, snapshot_id, format, file_url, generated_at |
| distribution_log | Track each email / Slack send | id, owner_user_id, snapshot_id, channel, recipients, status, sent_at |
| distribution_config | User's distribution list + Slack channel settings | id, owner_user_id, email_recipients[], slack_channel, schedule_time |

**Roles:** `admin` (manage users, view all snapshots, configure global settings) · `user` (view own snapshots, run ad-hoc analysis, manage own distribution config).

## 4. User Flow
1. User lands on the app — main dashboard is visible but slightly blurred behind a Sign Up / Log In modal (Sign Up is the default tab, styled in the app theme).
2. New user signs up (name, email, password) → account created → app unlocks. Returning user logs in → app unlocks.
3. Authenticated user lands on **Dashboard** showing today's snapshot (KPI tiles, variance vs. yesterday, mini trend chart). If no snapshot exists yet, an empty state with a "Run Analysis Now" CTA.
4. User clicks **Run Analysis Now** → Daily Revenue Coordinator orchestrates Scraper + Analyzer → snapshot appears with KPIs and variance.
5. From the Snapshot Detail, user can click **Generate Report** (PDF/Excel download), **Email Report** (sends to configured list), or **Post to Slack**.
6. On the configured schedule, the full pipeline runs automatically end-to-end — snapshot is saved, report generated, email sent, Slack posted — no user action needed.
7. User opens **History** to browse, filter (by date range), and compare past snapshots side-by-side.
8. User opens **Settings** to manage the distribution list, Slack channel, and schedule time.

## 5. Integrations Required

| Tool Name | Tool Source | Actions Required | Used By Agent | User Input Required |
|---|---|---|---|---|
| gmail | composio | GMAIL_SEND_EMAIL | Email Distribution Agent | Recipient list, subject template (configured once in Settings) |
| slack | composio | SLACK_CHAT_POST_MESSAGE | Slack Summary Agent | Channel ID/name (configured once in Settings) |

> **Configure in Lyzr Studio:** Connect the Gmail and Slack integrations from Studio → Integrations before first scheduled run. Web search is handled natively by the Claude model (`additional_model_params.web_search_options`) — no extra tool needed.

## 6. UI/UX Specification

### App Structure
Authenticated app shell with a slim left sidebar (Dashboard · History · Settings · Admin), a top bar (app title, date selector, user menu), and a main content area. The first screens are **Log In** and **Sign Up** (mandatory — DB layer is present); all other screens are gated by auth.

### Design System
**Components:** KPI tile cards, variance badges (green up / red down), data tables, trend line charts, filter chips, scheduled-run status banner, distribution log timeline, file download buttons, side drawers for snapshot detail.
**Visual Hierarchy:** 8pt grid; large bold KPI numbers, subtle muted labels; clear separation between "Today" hero block and "History/Trends" supporting sections.
**Information Density:** Dense but breathable — KPI tiles up top, variance + chart in the middle, distribution status + actions on the right rail. Empty/loading/error states for every async block.

### Screens

**Screen 0 — Log In (mandatory):** Centered card, Email + Password, "Log In" primary, "Sign Up" link, error state.

**Screen 0b — Sign Up (mandatory):** Centered card, Name + Email + Password, "Create Account" primary, "Log In" link, validation states.

**Screen 1 — Dashboard:** Hero KPI tiles (Total Revenue, AUM, Day-over-Day Variance %, Anomaly Count). Variance vs. yesterday chart (line + delta). Right rail: scheduled run status (last run timestamp, next run countdown), distribution status (Email/Slack sent ✓), "Run Analysis Now" primary CTA. Top movers table. Empty state if no snapshot yet.

**Screen 2 — Snapshot Detail:** Full KPI breakdown for the selected date, variance tables (vs. yesterday / vs. last week), anomalies list with explanations, raw source citations. Action bar: **Generate Report (PDF | Excel)**, **Email Report**, **Post to Slack**. Distribution log timeline shows every send and status.

**Screen 3 — History:** Filterable table of past daily snapshots (date range picker, search). Click row → opens Snapshot Detail in a side drawer. Compare-mode toggle lets user select 2 snapshots for side-by-side variance.

**Screen 4 — Settings:** Distribution list editor (email chips), Slack channel selector, schedule time picker, business-day toggle. Save state with confirmation toast.

**Screen 5 — Admin Panel (admin role only):** User list (name, email, role, last login), invite user, change role, deactivate.

### Complete User Journey
User signs up → lands on Dashboard with empty state → clicks **Run Analysis Now** → spinner → KPI tiles fill in, variance chart renders → user clicks **Generate Report (PDF)** → file downloads → clicks **Email Report** → toast confirms send → opens **Settings**, adds distribution list and schedule → next morning at 8 AM, schedule fires, snapshot saved, report + email + Slack all auto-dispatch → user opens History, filters last 30 days, picks two snapshots, compares side-by-side.
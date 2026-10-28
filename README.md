# Ledgerly — Digital Invoicing Frontend

Ledgerly is the web client for a digital invoicing system built for small businesses. It covers customers, products, invoices, payments, returns, customer credit, reports, and PDF/print output.

The app is a single-page React application. All business data is read from and written to the companion **Digital Invoice Backend** API. The browser stores only the session, theme, the per-user letterhead profile, and short-lived reminder dismissals.

---

## Table of contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Running the application](#running-the-application)
- [Available scripts](#available-scripts)
- [Application routes](#application-routes)
- [Backend integration](#backend-integration)
- [Data and state](#data-and-state)
- [Invoice screen behavior](#invoice-screen-behavior)
- [Validation](#validation)
- [PDF and print](#pdf-and-print)
- [Theming](#theming)
- [Project structure](#project-structure)
- [Production build](#production-build)
- [Production deployment](#production-deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Features

### Authentication and session
- Sign up, sign in, sign out, and session restore through the backend.
- "Remember me" stores the session in `localStorage`; otherwise `sessionStorage`.
- Protected routes redirect signed-out users to sign-in.
- An expired or rejected token clears the session and shows a "session expired" notice.
- Password-reset request screen that does not reveal whether an account exists.

### Dashboard
- Current-month billing and collection cards, monthly sales chart, recent invoices.
- Overdue and due-soon reminders as toasts. Dismissing a reminder hides it for 24 hours; it returns sooner if the invoice balance or due date changes.
- Low-stock notice, snoozable for 24 hours.

### Customers
- Searchable list. Create, edit, delete. Registered and unregistered tax status. NTN, phone, address.
- Customer credit balance and ledger shown in the invoice view.

### Products
- Catalogue with code, price, tax rate, stock, and active/inactive status. Low-stock highlighting.
- Invoice lines snapshot product data, so later catalogue edits do not change past invoices.

### Invoices
- Draft creation and editing with multiple lines. Server-side numbering.
- Issue, record payment, and void workflows.
- Filter chips: All, Draft, Pending, Partially paid, Overdue, Paid, Credit, Return, Cancelled. Chips match the backend badges, and one invoice can appear under several.
- Search and date-range filtering.
- Invoice opens as a document-style modal with a letterhead, bill-to block, items, totals, account summary, actions, returns, and (on Reports only) status history.
- Deep links: `/invoices?view=<id or number>`, `/invoices?status=<filter>`, `/invoices?edit=<id>`, `/invoices?new=1`.

### Payments and credit given
- One **Record payment** form takes **Paid amount**, **Credit amount** (udhaar), and **Credit reason**. Both are saved in one request.
- Cash plus credit may not exceed the unpaid balance. Credit is part of the unpaid amount, not added on top.
- Advance balance on the customer is unchanged by credit given.

### Returns
- Create a return by entering quantity and condition (saleable or unsaleable) per line. It stays pending.
- Approve or reject pending returns from the invoice modal. Rejection requires a reason.
- Approval restocks saleable items and settles the balance on the backend.

### Fully paid invoices
When an invoice is fully paid (unpaid is 0):
- Record payment, Mark fully paid, Create return, and Cancel invoice are hidden.
- Any open payment, return, or cancel form closes.
- Pending returns remain visible with their Approve and Reject actions.

### Reports
- Daily and monthly sales, tax by rate (charged and collected), customer-wise and product-wise sales, invoice history.
- Period filters: all time, this month, last month, this year.
- Clicking an invoice row opens the invoice modal with **status history**, newest first: label, date and time, user, and amount or reason.
- All totals come from the backend.

### Documents and output
- Single-invoice PDF download, and a multi-page PDF of the current filtered list.
- Browser print for the invoice document.
- Letterhead from the stored business profile (name, NTN, STRN, address, email).

### Interface
- Responsive layout. Light, dark, and system themes with no flash on load.
- Keyboard-accessible controls, focus states, inline validation.
- Local components only; no external UI library.

---

## Technology stack

| Package | Version | Purpose |
| --- | --- | --- |
| `react` / `react-dom` | 19.x | UI library and renderer |
| `react-router-dom` | 6.x | Routing and protected routes |
| `react-scripts` | 5.0.1 | Dev server, build, ESLint, Jest |
| `tailwindcss` | 3.x | Styling and theme tokens |
| `zod` | 3.x | Form and record validation |
| `jspdf` | 4.x | PDF generation |
| `jspdf-autotable` | 5.x | PDF tables |
| `web-vitals` | 2.x | Performance metrics |
| `@testing-library/*` | 16.x / 6.x / 13.x / 10.x | Component testing |

JavaScript with JSX and hooks. No TypeScript build step and no state-management library.

---

## Requirements

- **Node.js 20.19 or later**, npm 10 or later
- A running **Digital Invoice Backend**
- A current Chrome, Edge, Firefox, or Safari

SQL Server is required by the backend, not by this frontend.

---

## Installation

1. Clone and open the project:

   ```bash
   git clone <frontend-repository-url>
   cd digital-invoicing-system
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local environment file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   ```dotenv
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. Start the backend in a separate terminal (see the backend README).

5. Start the frontend:

   ```bash
   npm start
   ```

6. Open [http://localhost:3000](http://localhost:3000).

New accounts are created as `sales`. Ask an administrator to assign another role if needed (`npm run set-role` in the backend project).

---

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `REACT_APP_API_URL` | No | `http://localhost:5000/api` | Backend API base URL, no trailing slash. |

- The value is compiled into the bundle. Rebuild after changing it.
- Never put secrets in `REACT_APP_*` variables; they are visible to every browser.
- The frontend origin must be listed in the backend `CORS_ORIGINS`.

---

## Running the application

```powershell
npm start            # development server at http://localhost:3000
npm run build        # production bundle in build/
npx serve -s build   # preview the production build with SPA fallback
```

---

## Available scripts

| Script | Description |
| --- | --- |
| `npm start` | Development server. |
| `npm run build` | Optimized production build in `build/`. |
| `npm test` | Jest in watch mode. |
| `npm run eject` | Irreversible. Not needed for normal use. |

Non-interactive tests:

```powershell
$env:CI="true"; npm test -- --watchAll=false
```

---

## Application routes

| Route | Access | Screen |
| --- | --- | --- |
| `/login` | Signed-out only | Sign in |
| `/signup` | Signed-out only | Create account |
| `/forgot-password` | Public | Password-reset request |
| `/` | Authenticated | Dashboard |
| `/invoices` | Authenticated | Invoice list and invoice modal |
| `/customers` | Authenticated | Customers |
| `/products` | Authenticated | Products |
| `/reports` | Authenticated | Reports |
| `*` | Public | Not found |

---

## Backend integration

Components never call `fetch` or browser storage directly.

| Module | Responsibility |
| --- | --- |
| `src/services/apiClient.js` | Authenticated requests, bearer token, error normalization, session expiry handling |
| `src/services/authService.js` | Sign up, sign in, session validation, sign out, password-reset request |
| `src/services/customerService.js` | Customer CRUD |
| `src/services/productService.js` | Product CRUD and status |
| `src/services/invoiceService.js` | Invoice CRUD, issue, payments, returns, cancel, void, timeline |
| `src/services/creditService.js` | Customer credit balance, grant, apply, reverse |
| `src/services/reportService.js` | Report queries and response mapping |
| `src/services/storage.js` | Guarded `localStorage` / `sessionStorage` access |

Main calls used by the invoice screen:

| Action | Call |
| --- | --- |
| Record cash and/or credit | `recordInvoicePayment(invoiceId, { amount, creditAmount, creditReason, paymentDate, expectedVersion, idempotencyKey })` returns `{ invoice, replayed }` |
| Create return | `createInvoiceReturn(invoiceId, { returnDate, reason, items })` |
| Approve or reject return | `decideInvoiceReturn(invoiceId, returnId, { approve, reason })` |
| Cancel | `cancelInvoice(invoiceId, { reason, confirmNumber })` |
| Delete draft | `deleteInvoice(invoiceId)` |
| Status history | `getInvoiceTimeline(invoiceId)` returns `{ invoiceNumber, history, events, legacyActivities }` |

Every response uses `{ success, data }`. Errors use `{ success: false, message, errors }`. A `401` clears the session and returns the user to sign-in with a notice. A `403` means the role lacks the permission.

Credit-note endpoints are no longer used.

---

## Data and state

Server data is the source of truth: users, customers, products, invoices, payments, returns, customer credit, reports, and dashboard summaries.

Browser storage holds only:

| Key | Storage | Purpose |
| --- | --- | --- |
| `ledgerly_session` | `localStorage` or `sessionStorage` | Token and cached user |
| `ledgerly_theme` | `localStorage` | Theme choice |
| `ledgerly_data_<userId>` | `localStorage` | Business profile for the letterhead |
| `ledgerly_dismissed_reminders` | `localStorage` | 24-hour reminder dismissals |
| `ledgerly_low_stock_snooze_until` | `localStorage` | 24-hour low-stock snooze |

`DataContext` loads products, customers, and invoices at sign-in and exposes async mutations. No financial total is computed in the browser; the Account summary shows backend values.

---

## Invoice screen behavior

The invoice opens as a modal. Its sections, top to bottom:

1. **Letterhead:** business name, "Invoice", invoice number, and status badges.
2. **Bill to and dates:** customer, NTN and registration, address, phone; invoice date, due date, created by.
3. **Items:** name and code, quantity, price, tax rate, line total.
4. **Totals:** subtotal, tax, grand total.
5. **Account summary:** original total, return value, effective total, amount paid, customer credit applied, credit given, return credit (only when above zero), unpaid, excess cash (only when above zero).
6. **Customer credit balance** line.
7. **Action buttons:** shown according to the invoice state (see below).
8. **Open form:** payment, return, or cancel. Scrolls into view when opened.
9. **Returns:** list with pending Approve and Reject actions.
10. **Status history:** only when opened from Reports. Newest first.

### Button rules

| Button | Shown when |
| --- | --- |
| Record payment | Invoice is open and has a balance |
| Mark fully paid | Invoice is open and has a balance |
| Create return | Not draft, cancelled, void, or fully paid |
| Cancel invoice | Issued or overdue, with no money received |
| Edit draft | Draft |
| Download PDF | Always |

### Record payment form

- **Paid amount:** cash received now.
- **Credit amount:** udhaar given to the customer on this invoice (optional).
- **Credit reason:** required when a credit amount is entered.
- Rule: paid + credit may not exceed the unpaid balance. Example: unpaid 10,250, paid 8,000, credit 200 leaves unpaid **2,250** (of which 200 is credit given).

### Status badges

Badges come from the backend `statuses` list. Fully paid invoices show **Paid** only, plus **Return** if a return is still active. **Credit** appears only while credit given is still unpaid.

---

## Validation

Schemas in `src/lib/validators.js` (Zod) cover login, sign-up, password reset, customers, products, and invoices.

- `validate(schema, values)` returns field messages for forms.
- `parseOrThrow(schema, values)` throws the first message at the service boundary.

Numeric strings are coerced and range-checked. Cross-field rules use `.refine()`. Product codes must be exactly six digits. Money inputs accept at most two decimal places.

---

## PDF and print

- PDFs use jsPDF and jspdf-autotable (`src/lib/pdf.js`), always in the light palette.
- Single-invoice download from the invoice view and list actions.
- The invoice list can be exported as one PDF containing the current filtered results.
- Browser printing uses `src/styles/print.css`, which shows the invoice document. Action bars and forms are hidden with `print:hidden`.

---

## Theming

Palette values live in `src/theme/colors.js` as RGB triplets. `ThemeProvider` writes them to CSS variables, and `tailwind.config.js` maps semantic classes to them. Use semantic classes (`bg-card`, `text-ink`, `border-line`, `text-muted`), not hard-coded colors.

The inline script in `public/index.html` applies the saved theme before React mounts, which prevents a flash of the wrong palette.

---

## Project structure

```text
public/
  index.html                  # HTML shell and no-flash theme script
src/
  App.jsx                     # Routes
  index.js                    # Entry point
  components/
    common/                   # PageHeader, ConfirmDialog
    icons/                    # Inline SVG icons
    layout/                   # AppShell, Navbar, ProtectedRoute, ThemeToggle, UserMenu
    ui/                       # Button, Card, Chip, DataTable, Input, Modal, Pill, Select, Toast
  config/constants.js         # API URL, storage keys, navigation, statuses
  context/                    # AuthContext, DataContext, ToastContext
  features/
    auth/                     # Sign in, sign up, forgot password
    dashboard/                # Summary, chart, reminders, recent invoices
    invoices/                 # List, form, line items, totals, status pills
    customers/                # Customer list and form
    products/                 # Product list and form
    reports/                  # Report tabs, filters, drill-down
  pages/
    invoices/                 # InvoicesPage, InvoiceView (document modal)
    NotFoundPage.jsx
  hooks/                      # useAuth, useData, useTheme, useToast
  lib/                        # Dates, format, invoice math, invoice status, PDF, validators
  services/                   # API client and resource services
  styles/                     # Tailwind layers, animations, print styles
  theme/                      # colors.js, tokens.js, ThemeProvider.jsx
```

---

## Production build

```powershell
$env:REACT_APP_API_URL="https://api.example.com/api"
$env:GENERATE_SOURCEMAP="false"
npm run build
```

Linux or macOS:

```bash
REACT_APP_API_URL=https://api.example.com/api GENERATE_SOURCEMAP=false npm run build
```

Preview locally with `npx serve -s build`.

---

## Production deployment

The build is static and can be served by Nginx, Apache, IIS, a CDN, or any host with SPA fallback.

### Nginx (separate API origin)

```nginx
server {
    listen 80;
    server_name invoices.example.com;

    root /var/www/ledgerly/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

Build with `REACT_APP_API_URL=https://api.example.com/api`, and set backend `CORS_ORIGINS=https://invoices.example.com`.

### Nginx (same-origin API proxy)

```nginx
server {
    listen 80;
    server_name invoices.example.com;

    root /var/www/ledgerly/build;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Build with `REACT_APP_API_URL=/api`.

### Security headers

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://api.example.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;
```

Adjust `connect-src` for your API origin.

### Caching and releases
- Do not cache `index.html` long-term. `/static/` files are content-hashed and can be cached for a year.
- Deploy each release to a new directory and switch atomically. Keep one previous build for rollback.

### Checklist
- [ ] Backend `GET /api/health` returns `200`.
- [ ] `REACT_APP_API_URL` set before `npm run build`.
- [ ] Backend `CORS_ORIGINS` contains the exact frontend origin.
- [ ] SPA fallback configured; HTTPS enabled.
- [ ] A test account can sign in, create an invoice, record a payment, and download a PDF.
- [ ] Source maps disabled for a public build.
- [ ] No mixed-content or CORS errors in the browser console.

---

## Testing

```powershell
$env:CI="true"; npm test -- --watchAll=false
```

Component tests should mock the service layer. For end-to-end checks, run the backend suites and walk through: sign in, create customer and product, create and issue an invoice, record a partial payment with credit, approve a return, check the fully-paid button rules, open reports, and export a PDF.

---

## Troubleshooting

**Every request fails**
Confirm the backend runs at `REACT_APP_API_URL`. Open `http://localhost:5000/api/health` directly and check the Network tab for the status code.

**CORS error**
Add the exact origin, including scheme and port and without a trailing slash, to backend `CORS_ORIGINS`, then restart the backend.

**Session expires immediately**
`JWT_SECRET` changed on the backend, or the clocks differ. Sign in again.

**`403` on approve, reject, void, or credit actions**
The account's role lacks the permission. Ask an administrator to change the role.

**Record payment says "Cash plus credit cannot be more than the unpaid amount"**
Cash plus credit in that save exceeds the unpaid balance. Reduce one of the amounts. Credit is part of the unpaid amount, so it cannot be added on top.

**Status history is not shown on the invoice**
It only appears when the invoice is opened from Reports. Invoices opened from the Invoices page hide it by design.

**Status history shows "Unknown user"**
The audit row was written without a user snapshot, which can happen for older entries.

**Production build is stale**
Rebuild after changing any `REACT_APP_*` value and make sure the web server serves the new `build/` directory without caching `index.html`.

**Refreshing a route returns `404`**
Configure SPA fallback: `try_files $uri $uri/ /index.html;`.

**ESLint cache error during build**

```powershell
Remove-Item -Recurse -Force node_modules\.cache\.eslintcache -ErrorAction SilentlyContinue
npm run build
```

**Theme flashes on reload**
Confirm the inline script in `public/index.html` is present and `ThemeProvider` wraps the app.
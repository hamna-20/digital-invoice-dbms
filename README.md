# Ledgerly

A small invoicing app for freelancers and small businesses. Authentication and customer records use the companion Digital Invoice Backend API; product, invoice and report data are currently stored per user in the browser.

Built with React function components and hooks, React Router v6, Tailwind CSS v3, Zod for validation, and no UI component libraries.

## Getting started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### Backend authentication

Start the backend in `D:\digital invoice backend` before signing in or creating an account:

```bash
npm run dev
```

The frontend defaults to `http://localhost:5000/api`. To use a different API URL, set `REACT_APP_API_URL` in `.env.local` (for example, `REACT_APP_API_URL=http://localhost:5000/api`) and restart the frontend. The backend must allow the frontend origin in `CORS_ORIGINS`.

Sign-up creates an account through `/api/auth/signup` and then signs in to establish a session. Sign-in uses `/api/auth/signin`; the token is stored in browser storage according to the “Remember me” choice and validated on reload through `/api/auth/me`. Customer list/create/update/delete use the authenticated `/api/customers` endpoints. Customer registration status is stored by the backend as well.

After pulling the backend schema changes, apply its pending database migration from `D:\digital invoice backend` with `npm run prisma:deploy`, then regenerate the Prisma client with `npm run prisma:generate`. Existing customer records in the frontend's local storage are not automatically copied to the backend.

## Commands

| Command         | What it does                                                    |
| --------------- | --------------------------------------------------------------- |
| `npm start`     | Runs the app in development mode at http://localhost:3000        |
| `npm run build` | Creates a production build in `build/`                           |
| `npm test`      | Runs the test runner in interactive watch mode                   |

## Folder structure

```text
public/
  index.html                 # Shell + no-flash theme script
src/
  App.jsx                    # Routes
  index.js                   # React entry point
  components/
    common/                  # PageHeader, ConfirmDialog
    icons/                   # Inline SVG icon set
    layout/                  # AppShell, Navbar, NavTabs, ProtectedRoute, ThemeToggle, UserMenu
    ui/                      # Button, Card, DataTable, Input, Modal, Pill, Toast, etc.
  config/
    constants.js             # API URL, storage keys, navigation and statuses
    seed.js                  # Demo products, customers and invoices
  context/
    AuthContext.jsx          # Session and current user
    DataContext.jsx          # Per-user business data + async mutations
    ToastContext.jsx         # Transient notifications
  features/
    auth/                    # Login, signup, forgot password
    dashboard/               # Stats, chart, low-stock card, recent invoices
    invoices/                # Invoice list, form, line items, totals, view
    customers/               # Customer list and form
    products/                # Product list and form
    reports/                 # Sales and tax reports
  hooks/                     # useAuth, useData, useTheme, useToast
  lib/                       # Dates, formatting, invoice math, reports, validators
  pages/                     # NotFoundPage
  services/                  # API client, auth, customer, invoice, product, storage
  styles/                    # Tailwind layers, animations, print styles
  theme/                     # colors.js, ThemeProvider.jsx, tokens.js
```

## Changing colors

All palette values live in **`src/theme/colors.js`** — nowhere else. The file exports a light and a dark palette using RGB triplets:

```js
export const lightColors = {
  bg: '246 247 251',
  brand: '99 102 241',
  // ...
};
```

`ThemeProvider` writes each value to a CSS variable (`--color-brand: 99 102 241`), and `tailwind.config.js` maps semantic names to those variables (for example `bg-brand` → `rgb(var(--color-brand) / <alpha-value>)`). To re-theme the app, edit the triplets in `colors.js` and the UI updates in both themes. Do not add hex values elsewhere; use a semantic Tailwind class instead.

Gradients are defined in `tailwind.config.js` using `rgb(var(--color-…))` references, so they follow the palette too.

The chosen theme is stored under `ledgerly_theme` (Light / Dark / System, default System). An inline script in `public/index.html` applies the `dark` class before React mounts to prevent a flash. Printing always uses the light palette.

## Storage and backend integration

Authentication and customer records are connected to the companion API through **`src/services/authService.js`**, **`src/services/apiClient.js`**, and **`src/services/customerService.js`**. Product and invoice data remain local for now. The UI never accesses browser storage directly; reads and writes go through **`src/services/`**:

- `storage.js` — the only module that reads/writes `localStorage`, scoped per user via `ledgerly_data_{userId}`
- `authService.js` — signup, signin, token validation and session storage
- `customerService.js` — authenticated customer API operations
- `productService.js`, `invoiceService.js` — local business operations

`DataContext` awaits business-data service calls and exposes loading and saving state. The remaining local data record shape is:

```js
{ products, customers, invoices, nextInvoiceNumber }
```

## Validation

Form and record validation uses **[Zod](https://zod.dev)**, kept in a single file so the rules stay in one place:

- `src/lib/validators.js` — schemas for login, signup, password reset, customers, products and invoices, plus two helpers:
  - `validate(schema, values)` — safe parse for forms; returns the first message per field as `{ field: message }` alongside `data` when valid.
  - `parseOrThrow(schema, values)` — boundary parse for the service layer; throws the first failure message so the same rules protect stored data.

Numeric fields accept the strings that come out of `<input>` and are coerced (and range-checked) by the schema, so forms do not hand-roll `Number()` conversions. Cross-field rules such as password confirmation live in the same schema via `.refine()`. Messages are defined once in the schema and rendered inline under the field or as a toast.

Because the schemas live in `src/lib/validators.js`, `parseOrThrow` is also called inside `src/services/` (signup, login, password reset), so the rules apply whether the data arrives from the UI or from a future API client.

## Print

Invoice view and print use a dedicated `.invoice-print-area` visibility rule in `src/styles/print.css`, with `beforeprint` / `afterprint` switching to the light palette. Use the browser's print dialog to save an invoice as PDF.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# Tint & Tone

An e-commerce web application for makeup and skincare products, built for the Software Engineering course (Group 9).
Customers browse products, add them to a cart and pay with M-Pesa (Safaricom Daraja STK Push, sandbox). Administrators manage products and orders, view reports and read the audit log.

## Features

**Customers**
- Register, log in and log out
- Browse and search products by category
- Cart with stock checks
- Checkout with M-Pesa STK Push

**Administrators (admin and super admin)**
- Dashboard statistics
- Add, edit, delete and browse products
- View orders and update order status
- Reports: sales, products, low stock
- Audit log of administrator actions (who did what, and when)

**Security**
- Passwords hashed with bcrypt
- JWT authentication with role-based access control
- Parameterised (prepared) SQL statements
- Secrets kept in a `.env` file that is not committed to GitHub

## Technology

| Part | Tools |
|---|---|
| Frontend | React 19, Vite, React Router |
| Backend | Node.js, Express, JWT, bcryptjs |
| Database | MySQL (mysql2) |
| Payments | M-Pesa Daraja API (sandbox) |

## Project structure

```
TintTone/
  server/            Express API, database scripts
    routes/          auth, shop, admin, reports, mpesa
    middleware/      authentication and role checks
    utils/           audit logging, M-Pesa helper
    schema.sql       database tables
  tint-and-tone/     React frontend
```

## Requirements

- Node.js 18 or later
- MySQL 8 (or MariaDB)
- A Safaricom Daraja sandbox app (consumer key, consumer secret, passkey)
- A public HTTPS URL for the M-Pesa callback (for example an ngrok tunnel)

## Setup

### 1. Get the code
```
git clone https://github.com/RuthMuthoniMacharia/Tint-Tone.git
cd Tint-Tone
```

### 2. Database
Run `server/schema.sql` in MySQL (Workbench or the command line). It creates the `tint_tone` database and all tables.
Then add the M-Pesa columns once:
```
cd server
node migrate_mpesa.js
```

### 3. Backend
```
cd server
copy .env.example .env
```
Open `.env` and fill in:

| Variable | Meaning |
|---|---|
| DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME | MySQL connection |
| JWT_SECRET | Any long random string (required) |
| MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET | From the Daraja portal |
| MPESA_SHORTCODE, MPESA_PASSKEY | Sandbox shortcode and passkey |
| MPESA_CALLBACK_URL | Public HTTPS URL ending in `/api/mpesa/callback` |

Then:
```
npm install
npm run dev
```
The API runs on `http://localhost:5000`. Check `http://localhost:5000/api/health`.

### 4. Create the first administrator
```
node seedAdmin.js "Full Name" admin@example.com YourPassword
```

### 5. Frontend
```
cd tint-and-tone
npm install
npm run dev
```
Open the address shown (usually `http://localhost:5173`).

To use a backend on another machine, create `tint-and-tone/.env` containing:
```
VITE_API_URL=http://BACKEND-IP:5000
```

## Main API routes

| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | Public |
| GET | /api/products, /api/categories | Public |
| POST | /api/orders | Logged-in customer |
| GET | /api/orders/mine | Logged-in customer |
| POST | /api/mpesa/callback | Safaricom |
| GET | /api/mpesa/status/:orderId | Logged-in customer |
| GET/POST/PUT/DELETE | /api/admin/products | Admin |
| GET | /api/admin/orders, PUT /api/admin/orders/:id/status | Admin |
| GET | /api/admin/reports/sales, /products, /low-stock | Admin |
| GET | /api/admin/audit-logs | Admin |

## Team
Ruth Muthoni 222486 - Admin Panel, backend security, M-Pesa intergration
Shannell Wanjiru - Database Administrator
Njeri Masila - Front-end and UI developer


## Notes
- Payments run in the Daraja sandbox, so use sandbox test credentials.
- A delivery map feature was planned and removed because of API limitations.
- Do not commit `.env`. Use `.env.example` as the template.

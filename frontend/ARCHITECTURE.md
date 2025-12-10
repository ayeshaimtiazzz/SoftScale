# Frontend Folder Architecture

## Overview
The frontend is built with **React** using a **component-based architecture** with clear separation of concerns:
- **Pages** → **Components** → **Contexts** → **Utils** → **API**

---

## 📁 Root Structure

```
frontend/
├── package.json              # Dependencies & scripts
├── jsconfig.json            # JavaScript configuration
├── public/
│   └── index.html          # HTML entry point
│
└── src/
    ├── index.js             # React app entry point
    ├── App.js               # Main app component
    ├── index.css            # Global styles
    │
    ├── 📁 components/       # Reusable UI components
    ├── 📁 pages/            # Page components (routes)
    ├── 📁 contexts/         # React Context providers
    ├── 📁 providers/        # Higher-order providers
    ├── 📁 routes/           # Route definitions
    ├── 📁 utils/            # Utility functions
    ├── 📁 constants/        # Constants & enums
    ├── 📁 config/           # Configuration
    ├── 📁 theme/            # Theme configuration
    ├── 📁 styles/           # Global styles
    ├── 📁 i18n/             # Internationalization
    └── 📁 modules/          # Feature modules (legacy)
```

---

## 📂 Detailed Structure

### 1. **`src/components/`** - Reusable UI Components
Shared components used across multiple pages.

```
components/
├── 📁 Auth/                 # Authentication components (if any)
│
├── 📁 Forms/                # Form components
│   ├── Login.js             # Login form
│   ├── Signup.js            # Signup form
│   ├── ForgotPassword.js     # Password reset form
│   ├── ResetPassword.js     # Reset password form
│   ├── RoleSelection.js     # Role selection form
│   ├── CompanyForm.js       # Company registration form
│   ├── FreelancerForm.js    # Freelancer registration form
│   └── JobSeekerForm.js     # Job seeker registration form
│
├── 📁 layout/               # Layout components
│   ├── AppLayout.js         # Main app layout wrapper
│   ├── Header.js            # Top navigation header
│   ├── Header.css           # Header styles
│   ├── Sidebar.js            # Side navigation sidebar
│   └── styles.js            # Layout styles
│
├── 📁 common/               # Common components
│   └── PageTitle.js         # Page title component
│
├── 📁 OnboardingStepper/    # Onboarding stepper component
│   └── index.js
│
├── PasswordStrengthIndicator.js  # Password strength meter
├── SentimentChart.js        # Sentiment analysis chart
├── StatCard.js              # Statistics card component
└── TopCandidates.css        # Top candidates styles
```

**Purpose**: Reusable, composable UI components.

---

### 2. **`src/pages/`** - Page Components
Main page components corresponding to routes.

```
pages/
├── 📁 auth/                 # Authentication pages
│   ├── login.js             # Login page
│   ├── signup.js            # Signup page
│   ├── role-selection.js    # Role selection page
│   ├── onboarding.js        # Onboarding page
│   └── styles.css           # Auth styles
│
├── 📁 dashboard/            # Dashboard page
│   ├── index.js             # Main dashboard
│   ├── metric-cards.js      # Metric cards component
│   ├── top-candidates.js    # Top candidates component
│   ├── top-jobs-projects.js # Top jobs/projects component
│   ├── JobFormModal.js      # Job posting modal
│   ├── ProspectsModal.js    # Prospects modal
│   └── styles.css           # Dashboard styles
│
├── 📁 crm/                  # CRM/Deal Management
│   ├── index.js             # Main CRM page
│   ├── styles.css
│   └── 📁 components/       # CRM-specific components
│       ├── DealKanbanBoard.js    # Kanban board view
│       ├── DealTableView.js      # Table view
│       ├── DealDetailsModal.js  # Deal details modal
│       └── DealMetrics.js       # Deal metrics
│
├── 📁 proposal-generation/  # Proposal Generation
│   ├── index.js             # Main proposal page
│   ├── template-card.js     # Template card component
│   └── styles.css           # Proposal styles
│
├── 📁 talent-match/         # Talent Matching
│   ├── index.js             # Talent matching page
│   └── styles.css
│
├── 📁 talent-details/       # Talent Details
│   ├── index.js             # Talent details page
│   └── styles.css
│
├── 📁 profile/              # User Profile
│   ├── index.js             # Profile page
│   └── styles.css
│
├── 📁 profile-details/      # Profile Details (if any)
│
├── 📁 account-settings/     # Account Settings
│   ├── index.js             # Settings page
│   └── styles.css
│
├── 📁 billing/              # Billing & Subscription
│   ├── index.js             # Billing page
│   └── styles.css
│
├── 📁 forms/                # Form pages (legacy)
│   ├── company-form.js
│   ├── freelancer-form.js
│   └── job-seeker-form.js
│
├── 📁 insights/             # Insights/Analytics
│   └── index.js
│
├── 📁 lead-discovery/       # Lead Discovery
│   └── index.js
│
├── 📁 price-prediction/      # Price Prediction
│   └── index.js
│
├── 📁 sentiment-analysis/    # Sentiment Analysis
│   └── index.js
│
└── styles.css               # Global page styles
```

**Purpose**: Page-level components that represent routes.

---

### 3. **`src/contexts/`** - React Contexts
Global state management using React Context API.

```
contexts/
├── AuthContext.js           # Authentication state
│   └── Provides: user, token, login, logout, etc.
│
└── ThemeContext.js          # Theme state (light/dark mode)
    └── Provides: mode, toggleTheme, etc.
```

**Purpose**: Global state management for authentication and theme.

---

### 4. **`src/providers/`** - Context Providers
Higher-order providers that wrap the app.

```
providers/
├── index.js                 # Provider aggregation
├── AuthProvider.js          # Auth context provider
├── ThemeProvider.js          # Theme context provider
├── I18nProvider.js          # Internationalization provider
└── ToastProvider.js         # Toast notification provider
```

**Purpose**: Context providers that wrap the application.

---

### 5. **`src/routes/`** - Route Definitions
React Router route configuration.

```
routes/
├── index.js                 # Main route definitions
│   └── Defines all app routes
│
└── protected-route.js       # Protected route wrapper
    └── HOC for auth-protected routes
```

**Purpose**: Route configuration and protection.

---

### 6. **`src/utils/`** - Utility Functions
Helper functions used across the app.

```
utils/
├── storage.js               # LocalStorage utilities
│   └── getAuthToken, setAuthToken, etc.
│
├── tokenRefresh.js          # JWT token refresh logic
│
├── errorHandler.js          # Error handling utilities
│
└── passwordStrength.js      # Password strength validation
```

**Purpose**: Reusable utility functions.

---

### 7. **`src/constants/`** - Constants & Enums
Application-wide constants.

```
constants/
├── index.js                 # Main constants export
├── colors.js                # Color palette
├── domains.js               # Industry domains
├── locations.js             # Location data
├── selectionOptions.js      # Dropdown options
└── sampleData.js            # Sample/mock data
```

**Purpose**: Centralized constants and enums.

---

### 8. **`src/config/`** - Configuration
App configuration (API endpoints, etc.).

```
config/
└── index.js                 # API base URL, endpoints
```

**Purpose**: Configuration values (API URLs, etc.).

---

### 9. **`src/theme/`** - Theme Configuration
Material-UI theme configuration.

```
theme/
└── index.js                 # MUI theme setup
```

**Purpose**: Material-UI theme customization.

---

### 10. **`src/styles/`** - Global Styles
Global CSS styles.

```
styles/
└── global.css               # Global stylesheet
```

**Purpose**: Global CSS styles.

---

### 11. **`src/i18n/`** - Internationalization
Translation and localization.

```
i18n/
├── config.js                # i18n configuration
└── 📁 locales/
    └── en.json              # English translations
```

**Purpose**: Multi-language support.

---

### 12. **`src/modules/`** - Feature Modules (Legacy)
Legacy feature modules (may be deprecated).

```
modules/
├── dashboard/
│   └── Dashboard.js
└── talent-match/
    └── TalentMatch.js
```

**Purpose**: Legacy feature modules (consider migrating to pages/).

---

## 🔄 Component Flow

```
User Interaction
    ↓
[pages/] → Page Component
    ↓
[components/] → Reusable Components
    ↓
[contexts/] → Global State (Auth, Theme)
    ↓
[utils/] → Helper Functions
    ↓
API Call → Backend
```

**Example Flow: Login**
1. `pages/auth/login.js` → Login page renders
2. `components/Forms/Login.js` → Login form component
3. User submits → `contexts/AuthContext.js` → `login()` function
4. `utils/storage.js` → Save token to localStorage
5. `routes/protected-route.js` → Redirect to dashboard

---

## 🎯 Key Design Patterns

### 1. **Component-Based Architecture**
- Reusable components in `components/`
- Page-level components in `pages/`
- Component composition for complex UIs

### 2. **Context API for State Management**
- `AuthContext` for authentication state
- `ThemeContext` for theme state
- No Redux (using React Context)

### 3. **Route Protection**
- `protected-route.js` HOC for auth-protected routes
- Automatic redirect to login if not authenticated

### 4. **Provider Pattern**
- Multiple providers wrap the app
- `providers/index.js` aggregates all providers

### 5. **Utility Functions**
- Shared logic in `utils/`
- Constants in `constants/`
- Configuration in `config/`

---

## 📱 Page Structure

### Main Pages:
1. **Authentication** (`pages/auth/`)
   - Login, Signup, Role Selection, Onboarding

2. **Dashboard** (`pages/dashboard/`)
   - Main dashboard with metrics, top candidates, jobs/projects

3. **CRM** (`pages/crm/`)
   - Deal management with Kanban board and table views

4. **Proposal Generation** (`pages/proposal-generation/`)
   - AI-powered proposal generation with templates

5. **Talent Match** (`pages/talent-match/`)
   - Talent matching and discovery

6. **Profile** (`pages/profile/`)
   - User profile management

7. **Account Settings** (`pages/account-settings/`)
   - User settings and preferences

8. **Billing** (`pages/billing/`)
   - Subscription and payment management

9. **Analytics Pages**:
   - Insights, Sentiment Analysis, Price Prediction, Lead Discovery

---

## 🎨 Styling Approach

1. **Material-UI (MUI)**: Primary UI component library
2. **CSS Modules**: Component-specific styles (`.css` files)
3. **Theme**: Centralized theme in `theme/index.js`
4. **Global Styles**: `styles/global.css` and `index.css`

---

## 🔐 Authentication Flow

```
1. User visits protected route
   ↓
2. protected-route.js checks AuthContext
   ↓
3. If not authenticated → Redirect to /login
   ↓
4. User logs in → AuthContext.login()
   ↓
5. Token saved to localStorage (utils/storage.js)
   ↓
6. Redirect to requested page
```

---

## 🌐 API Integration

- API calls made from page/component level
- Base URL configured in `config/index.js`
- Token attached via `utils/storage.js` → `getAuthToken()`
- Error handling via `utils/errorHandler.js`

---

## 📦 Key Dependencies

- **React** - UI library
- **React Router** - Routing
- **Material-UI (MUI)** - Component library
- **Axios** - HTTP client
- **React i18next** - Internationalization
- **Context API** - State management

---

## 🚀 Entry Points

1. **`public/index.html`** - HTML entry point
2. **`src/index.js`** - React app initialization
3. **`src/App.js`** - Main app component with providers and routes

---

## 📝 File Naming Conventions

- **Components**: PascalCase (e.g., `Header.js`, `Login.js`)
- **Pages**: kebab-case folders, `index.js` inside (e.g., `pages/proposal-generation/index.js`)
- **Utils**: camelCase (e.g., `storage.js`, `errorHandler.js`)
- **Constants**: camelCase (e.g., `colors.js`, `domains.js`)

---

## 🔄 Data Flow

```
User Action
    ↓
Page Component
    ↓
Context/State Update
    ↓
API Call (if needed)
    ↓
State Update
    ↓
UI Re-render
```

---

## 🎯 Best Practices

1. **Component Reusability**: Extract common UI into `components/`
2. **Page Organization**: One page per route in `pages/`
3. **State Management**: Use Context API for global state
4. **Utility Functions**: Shared logic in `utils/`
5. **Constants**: Magic strings/numbers in `constants/`
6. **Styling**: Component-specific styles with CSS modules
7. **Route Protection**: Use `protected-route.js` HOC

---

## 📚 Notes

- **`modules/`**: Legacy folder, consider migrating to `pages/`
- **`components/Forms/`**: Reusable form components
- **`components/layout/`**: App-wide layout components (Header, Sidebar)
- **Context Providers**: Wrap app in `App.js` via `providers/index.js`
- **Theme**: Material-UI theme configured in `theme/index.js`


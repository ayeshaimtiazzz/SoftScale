# SoftScale Frontend

React frontend application for the SoftScale platform, following Material UI, internationalization, and accessibility best practices.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (see `.env.example`):
```bash
REACT_APP_API_BASE=http://127.0.0.1:8000
```

3. Start the development server:
```bash
npm start
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── modules/            # Feature-based modules
├── routes/             # Centralized routing configuration
├── providers/          # Context providers (theme, i18n, etc.)
├── utils/              # Utility functions
├── constants/          # Constants and enums
├── config/             # Configuration files
├── theme/              # Material UI theme
├── i18n/               # Internationalization
└── assets/             # Static assets
```

## Code Standards

This project follows strict coding standards:

- **Modern React (JavaScript)**: Functional components + hooks only
- **Material UI**: Use Material UI components and styled API
- **i18n**: All user-facing text must use translations
- **Absolute Imports**: Use path aliases (e.g., `components/Button`)
- **No Magic Values**: Use constants/enums
- **JSDoc**: Document all components and utilities
- **ESLint/Prettier**: Enforced code style

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## Architecture Status

The frontend aligns with the Frontend (React) Rules & Standards using plain JavaScript:

- Material UI theme setup  
- i18n configuration  
- Absolute imports (via `jsconfig.json`)  
- ESLint/Prettier  
- Constants and enums  
- Centralized routing  
- Core utilities and providers




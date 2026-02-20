# Contributing to NestJS Template

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Development Setup

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/nestjs-template.git
   cd nestjs-template
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy environment file:

   ```bash
   cp .env.example .env
   ```

5. Start development:

   ```bash
   # With Docker
   docker-compose -f docker-compose.dev.yml up

   # Without Docker (requires local PostgreSQL)
   npm run start:dev
   ```

## Code Style

- Follow the existing code style
- Use TypeScript strict mode
- Run linting before committing:
  ```bash
  npm run lint
  ```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:

```
feat: add password reset functionality
fix: resolve JWT token expiration issue
docs: update README with Docker instructions
```

## Pull Request Process

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit

3. Ensure all tests pass:

   ```bash
   npm run test
   npm run test:e2e
   ```

4. Push to your fork and create a Pull Request

5. Fill out the PR template with:
   - Description of changes
   - Related issues
   - Testing performed

## Project Structure

```
src/
├── core/           # Global singleton services
├── shared/         # Reusable across features
└── features/       # Feature modules
```

See [docs/ARCHITECTURE_GUIDE.md](docs/ARCHITECTURE_GUIDE.md) for detailed architecture documentation.

## Testing

- Write unit tests for services
- Write E2E tests for API endpoints
- Use placeholder tests (`it.todo()`) for planned functionality

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e
```

## Questions?

Open an issue for questions or discussions.

# Contributing Guide

Thank you for your interest in contributing to Volley Teams! 🏐

## How to Contribute

### Report a Bug

If you find a bug, please open an issue with:
- A clear description of the problem
- Steps to reproduce the bug
- Expected behavior vs actual behavior
- Screenshots if relevant
- Your environment (OS, browser, Node.js version)

### Propose a New Feature

To propose a new feature:
1. First check that it doesn't already exist in the issues
2. Open an issue with the "enhancement" tag
3. Clearly describe the feature and its usefulness
4. Wait for feedback before starting development

### Submit a Pull Request

1. **Fork** the repository
2. **Clone** your fork locally
   ```bash
   git clone https://github.com/your-username/volley-teams.git
   ```

3. **Create a branch** for your feature
   ```bash
   git checkout -b feature/my-new-feature
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Configure Convex**
   ```bash
   npx convex dev
   ```

6. **Make your changes**
   - Write clean and readable code
   - Follow existing code conventions
   - Comment complex code
   - Test your changes

7. **Commit your changes**
   ```bash
   git commit -m "feat: add my new feature"
   ```
   
   Use conventional commit prefixes:
   - `feat:` for a new feature
   - `fix:` for a bug fix
   - `docs:` for documentation
   - `style:` for formatting
   - `refactor:` for refactoring
   - `test:` for tests
   - `chore:` for maintenance tasks

8. **Push to your fork**
   ```bash
   git push origin feature/my-new-feature
   ```

9. **Open a Pull Request**
   - Clearly describe your changes
   - Reference related issues
   - Add screenshots if relevant

## Code Standards

### TypeScript
- Use TypeScript for all new code
- Define explicit types
- Avoid `any` as much as possible

### React
- Use functional components with hooks
- Prefer composition over inheritance
- Keep components small and reusable

### Styling
- Use Tailwind CSS for styling
- Follow existing naming conventions
- Ensure the interface is responsive

### Convex
- Document queries and mutations
- Validate user inputs
- Handle errors appropriately

## Commit Structure

Example of a good commit:
```
feat: add level filter in statistics

- Add level selector in PlayerStats
- Filter data according to selected level
- Update interface to display filter

Closes #42
```

## Tests

Before submitting a PR:
- [ ] Code compiles without errors (`npm run build`)
- [ ] Linter passes (`npm run lint`)
- [ ] Application works locally (`npm run dev`)
- [ ] Existing features are not broken
- [ ] New features work as expected

## Questions?

Feel free to open an issue with the "question" tag if you need help or clarification.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

Thank you for your contribution! 🙏

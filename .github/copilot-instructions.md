# GitHub Copilot Instructions

## Development Environment

- Local command execution uses PowerShell as the default shell
- Project is a Vite-based React TypeScript application
- The project is configured for deployment to GitHub Pages
- Local development server runs at http://localhost:5173

## Version Control & Deployment

### Git Workflow
- Always push changes to the remote repository after committing
- Use descriptive commit messages that explain the changes
- Basic workflow:
  1. `git add .`
  2. `git commit -m "descriptive message"`
  3. `git push`

### Deployment
- Use `npm run deploy` to build and deploy changes to GitHub Pages
- This runs the build process and publishes to the gh-pages branch
- Changes to documentation files don't require redeployment
- Only changes affecting the built application (source code, styles, etc.) need deployment

## Project Structure

The main components of this project are:
- React components in `src/` directory
- OpenAI API integration for evaluating answers
- Local storage for persisting API keys
- GitHub Pages deployment configuration

## Key Features

- Open question evaluation using OpenAI API
- Sample solution based assessment
- Percentage-based scoring
- Secure API key handling via UI (not environment variables)
- Responsive table-based results display

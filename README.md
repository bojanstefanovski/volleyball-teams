# 🏐 Volley Teams

A modern web application for volleyball team management, enabling automatic and manual team creation with balanced skill levels, session tracking, and player statistics analysis.

## ✨ Features

- **Automatic Team Generation**: Intelligent algorithm to create balanced teams based on player skill levels
- **Manual Session Creation**: Create and manage your sessions and matches manually
- **Session History**: View all past sessions with match details and scores
- **Player Statistics**: Analyze individual performance (wins, losses, win rate)
- **Player Management**: Admin interface to add, edit, and manage players
- **Import/Export**: Import players from Excel files
- **Dark Mode**: Modern interface with dark theme support
- **Responsive**: Optimized for mobile, tablet, and desktop

## 🚀 Technologies

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Backend**: [Convex](https://www.convex.dev/) - Real-time backend
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Language**: TypeScript
- **UI**: React 19

## 📋 Prerequisites

- Node.js 20 or higher
- npm, yarn, pnpm, or bun
- A Convex account (free)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/volley-teams.git
cd volley-teams
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Configure Convex:
```bash
npx convex dev
```
Follow the instructions to create a Convex project and connect your application.

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
volley-teams/
├── app/                    # Next.js pages (App Router)
├── components/            # React components
│   ├── admin/            # Admin interface
│   ├── player-picker/    # Automatic team generation
│   ├── manual-session-creator/  # Manual creation
│   ├── sessions/         # Session history
│   ├── stats/            # Player statistics
│   └── shared/           # Reusable components
├── convex/               # Convex backend (schema, queries, mutations)
├── lib/                  # Utilities and types
└── scripts/              # Utility scripts
```

## 🎯 Usage

### Automatic Team Generation

1. Select present players
2. Configure constraints (number of teams, players per team)
3. Click "Generate Teams"
4. Save the session with match scores

### Manual Creation

1. Go to the "Manual Creation" tab
2. Create your teams manually
3. Add matches and scores
4. Save the session

### Administration

1. Access the "Admin" tab
2. Add players individually or import from Excel
3. Manage player rankings and skill levels

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the framework
- [Convex](https://www.convex.dev/) for the real-time backend
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📧 Contact

For questions or suggestions, feel free to open an issue on GitHub.

---

Made with ❤️ for the volleyball community

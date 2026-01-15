# Food Memories Workshop Toolkit

Facilitator companion app for the Food Memories Workshop. The tool brings together agenda guidance, participant management, real-time timers, and a collaborative photo archive backed by a Node/Express API and MongoDB for persistence.

## Objectives

- Keep facilitators oriented through multi-day workshop phases and modules.
- Capture logistical details (participants, notes, checklists) in one place.
- Collect and surface photos taken during the sessions, including camera capture and file uploads.
- Provide a simple, self-hosted stack that runs comfortably on a laptop.

## Key Features

- **Agenda Navigator:** Day/phase/module structure with completion tracking and built-in timers (countdown or stopwatch) plus audible cues.
- **Facilitator Tools:** Persistent checklist, notes drawer, and quick navigation controls.
- **Participant Manager:** CRUD UI powered by MongoDB for adding, editing, exporting, and importing participant rosters.
- **Photo Manager:** Upload from disk or camera, annotate captions, browse in a lightbox, and delete on demand. Images are stored under `server/uploads` and exposed via the backend.
- **REST API:** Express routes at `/api/participants` and `/api/photos`, plus `/uploads` for static access and `/health` for monitoring.

## Architecture Overview

- **Frontend:** React (Create React App), Tailwind CSS utility styling, client-side state via hooks.
- **Backend:** Node.js (Express + Multer + Mongoose), file storage on the filesystem, MongoDB for structured data.
- **Database:** MongoDB (local instance expected). Connection string configurable via environment variables.

## Prerequisites

- **Node.js** 18+ (tested with Node 20/24). Includes npm.
- **MongoDB** Community Server running locally.
- For macOS/Linux convenience scripts: Bash shell + Homebrew (for `brew services`).
- For Windows users: PowerShell or Command Prompt for manual steps; Git Bash or WSL if you want to run the Bash helper scripts.

## Initial Setup

1. **Install dependencies**
	 ```bash
	 npm install
	 npm --prefix server install
	 ```
2. **Configure environment**
	 - Copy `server/.env.example` to `server/.env`.
	 - Adjust values if needed (most setups can keep the defaults):
		 ```dotenv
		 MONGODB_URI=mongodb://localhost:27017/food-memories
		 PORT=4000
		 UPLOAD_ROOT=uploads
		 ```
3. **Prepare uploads directory** (created automatically on first upload, but you can ensure it exists):
	 ```bash
	 mkdir -p server/uploads
	 ```

## Running the Stack Manually

### 1. Start MongoDB

- **macOS / Linux (systemd):**
	```bash
	brew services start mongodb-community@7.0    # macOS/Homebrew
	sudo systemctl start mongod                  # Linux example
	```
- **Windows:**
	- If installed as a service: `net start MongoDB` (or use Services MMC).
	- Otherwise run `mongod` with your config file.

### 2. Start the backend API

```bash
npm run dev --prefix server
# or
cd server && npm run dev
```

Once running, verify at http://localhost:4000/health.

### 3. Start the frontend

In another terminal:
```bash
npm start
```

Open http://localhost:3000 to access the facilitator UI. Uploaded files are served from http://localhost:4000/uploads/.

### 4. Stopping services

- Hit `Ctrl+C` in each terminal running the backend and frontend.
- Stop MongoDB with `brew services stop mongodb-community@7.0`, `sudo systemctl stop mongod`, or the Windows service manager.

## Running with Helper Scripts (macOS/Linux/Git Bash)

Two Bash scripts in `scripts/` streamline startup and shutdown:

- `./scripts/start-stack.sh`: starts MongoDB (via Homebrew), boots the backend, waits for `/health`, then launches the frontend. It prints whimsical status updates and cleans up both Node processes on `Ctrl+C`.
- `./scripts/stop-stack.sh`: terminates anything listening on ports 3000/4000 and stops the MongoDB Homebrew service.

> **Windows users:** Run the scripts from Git Bash or WSL (`bash scripts/start-stack.sh`). Otherwise follow the manual steps above.

## API Reference (Quick Glance)

| Method | Path                       | Description                                |
|--------|----------------------------|--------------------------------------------|
| GET    | `/health`                  | Simple service status check.               |
| GET    | `/api/participants`        | List participants (sorted newest first).   |
| POST   | `/api/participants`        | Create a participant.                      |
| PUT    | `/api/participants/:id`    | Update an existing participant.            |
| DELETE | `/api/participants/:id`    | Remove a participant.                      |
| GET    | `/api/photos`              | List stored photos (most recent first).    |
| POST   | `/api/photos`              | Upload a photo (multipart form data).      |
| DELETE | `/api/photos/:id`          | Delete a photo and its file.               |
| GET    | `/uploads/...`             | Static hosting for uploaded assets.        |

## Useful npm Commands

- `npm test` – run React tests in watch mode.
- `npm run build` – create a production build of the React app.
- `npm run lint` or stylistic tooling – add as needed (not configured by default).

## Troubleshooting Tips

- **Port already in use:** Run `./scripts/stop-stack.sh` (macOS/Linux) or close any orphaned Node processes manually (`lsof -iTCP:3000`, `kill <pid>`).
- **MongoDB connection failed:** Confirm `mongod` is running and matches `MONGODB_URI` in `server/.env`.
- **Uploads 404:** Ensure the backend is running and that `UPLOAD_ROOT` matches the directory where the files are stored.

Happy facilitating! If you encounter issues or have ideas for new facilitator aids, feel free to open an issue or extend the toolkit.

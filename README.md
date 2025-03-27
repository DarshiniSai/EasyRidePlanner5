SmartRouteNavigator

SmartRouteNavigator is a full-stack React application with an Express backend, designed to provide route planning and geocoding functionality. It leverages OpenStreetMap’s Nominatim for geocoding and OSRM for routing, with real-time traffic and construction updates via WebSocket. Originally developed in Replit, this project has been adapted to run locally with separate frontend and backend servers.

Features
Geocoding: Search for places or reverse geocode coordinates using Nominatim.

Route Planning: Calculate routes between two points with OSRM, supporting multiple transport modes (driving, walking, cycling).

Real-Time Updates: WebSocket-based traffic and construction zone notifications.

Responsive UI: Built with React, TypeScript, and Radix UI components.

Project Structure
text

Copy
SmartRouteNavigator/
├── client/              # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/  # React components (e.g., LocationInput, Map)
│   │   ├── services/    # API services (e.g., geocodingService.ts)
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
├── server/              # Backend (Express + TypeScript)
│   ├── index.ts         # Express server entry
│   ├── routes.ts        # API routes (geocoding, routing)
│   └── vite.ts          # Vite integration (optional)
├── package.json         # Dependencies and scripts
└── vite.config.ts       # Vite configuration
Prerequisites
Node.js: v18 or higher
npm: v8 or higher
Git: For cloning the repository
Setup Instructions
1. Clone the Repository
bash

Collapse

Wrap

Copy
git clone https://github.com/DarshiniSai/EasyRidePlanner5.git
cd EasyRidePlanner5

2. Install Dependencies
Install all required packages for both frontend and backend:

bash

Collapse

Wrap

Copy
npm install
3. Run the Backend
Start the Express server on localhost:5000:

bash

Collapse

Wrap

Copy
npm run dev


This uses tsx to run server/index.ts.
Provides API endpoints like /api/geocode and /api/routes.


4. Run the Frontend
Start the Vite development server on localhost:5173:

bash

Collapse

Wrap

Copy
npm run dev:frontend


Opens the React app in your browser.
Proxies /api requests to localhost:5000.


5. Access the Application
Open http://localhost:5173 in your browser.

Use the location input to search for places or plan routes.

Available Scripts

Command	Description

npm run dev	Runs the Express backend on port 5000

npm run dev:frontend	Runs the Vite frontend on port 5173

npm run build	Builds the frontend for production

npm run start	Runs the production-built backend

API Endpoints

GET /api/geocode?q=<query>&reverse=<true|false>:

Forward geocoding: Search for places (e.g., ?q=London).

Reverse geocoding: Get address from coordinates (e.g., ?q=51.5074,-0.1278&reverse=true).

Returns: JSON array of results.

POST /api/routes:

Body: { "source": [lon, lat], "destination": [lon, lat], "transportMode": "driving" }.

Returns: JSON array of route options.

WebSocket

Path: /ws

Messages:

subscribe: Subscribe to traffic updates for an area.

updateTransportMode: Change transport mode for updates.

Receives: trafficUpdate, constructionZones, constructionUpdate.

Development Notes

Local Setup: Unlike Replit’s unified environment, the local setup runs Vite and Express separately. The Vite proxy (/api → localhost:5000) ensures API calls work.

Troubleshooting: If you encounter SyntaxError: Unexpected token '<', verify the proxy in vite.config.ts and ensure backend routes are registered before any catch-all middleware.

Dependencies

Frontend: React, TypeScript, Vite, Radix UI, Axios, Tanstack Query.

Backend: Express, TypeScript, WebSocket (ws), Axios, Zod.

Contributing
Fork the repository.

Create a feature branch (git checkout -b feature/your-feature).

Commit changes (git commit -m "Add your feature").

Push to the branch (git push origin feature/your-feature).

Open a pull request.

License
MIT License - feel free to use and modify this project as you see fit.

Customization
Repository URL: Replace https://github.com/your-username/SmartRouteNavigator.git with your actual repo URL.

Additional Details: Add sections like “Screenshots,” “Known Issues,” or “Future Features” if desired.

Dependencies: The list is simplified; you can run npm list --depth=0 to get the full list if needed.


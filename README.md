# UnisoNetwork

UnisoNetwork is a modern, full-stack social networking platform designed for university students. It provides a centralized hub for students to connect, collaborate, and share resources within their university community.

## ✨ Features

- **Authentication**: Secure user registration and login with OTP (One-Time Password) verification.
- **Groups**: Create and join public or private groups for clubs, study sessions, or common interests.
- **Forums**: Engage in discussions on various topics in dedicated forum channels.
- **Events**: Discover and RSVP to university events, workshops, and seminars.
- **Internships**: Find and apply for internship opportunities.
- **User Profiles**: Create and customize your user profile.
- **Real-time Notifications**: Get notified via SMS and email for important updates.

## 🛠️ Tech Stack

- **Frontend**:
  - [React](https://reactjs.org/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Vite](https://vitejs.dev/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [Shadcn/ui](https://ui.shadcn.com/) for UI components

- **Backend**:
  - [Node.js](https://nodejs.org/)
  - [Express.js](https://expressjs.com/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Drizzle ORM](https://orm.drizzle.team/) for database access
  - [JWT](https://jwt.io/) for authentication

- **Database**:
  - SQL-based (e.g., PostgreSQL, MySQL)

- **Shared**:
  - Shared TypeScript schema for type safety between client and server.

## 🏛️ Architecture

<img width="855" height="793" alt="Screenshot 2026-03-18 234322" src="https://github.com/user-attachments/assets/74df7539-2101-4e3b-904b-43dde257e94a" />

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/download/) (v18.x or higher)
- [npm](https://www.npmjs.com/get-npm)
- A running SQL database instance.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/UnisoNetwork.git
    cd UnisoNetwork
    ```

2.  **Install root dependencies:**
    ```bash
    npm install
    ```

3.  **Install client dependencies:**
    ```bash
    cd client
    npm install
    ```

4.  **Install server dependencies:**
    ```bash
    cd ../server
    npm install
    ```

### Configuration

The application requires environment variables for connecting to the database and other services.

1.  Create a `.env` file in the `server` directory.
2.  Add the necessary environment variables. You can use `server/.env.example` as a template if it exists.

    ```
    DATABASE_URL="your_database_connection_string"
    JWT_SECRET="your_jwt_secret"
    # Add other variables for SMS, Email, etc.
    ```

### Database Migration

Run the database migrations to set up the schema.

```bash
cd server
npm run db:migrate # Assuming you have a script for this
```

### Running the Application

1.  **Start the server:**
    ```bash
    cd server
    npm run dev
    ```

2.  **Start the client:**
    In a new terminal:
    ```bash
    cd client
    npm run dev
    ```

The client will be running on `http://localhost:5173` and the server on the configured port.

## 📂 Project Structure

```
.
├── client/         # React frontend application
├── server/         # Node.js backend server
├── shared/         # Shared code (e.g., TypeScript types)
└── package.json
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

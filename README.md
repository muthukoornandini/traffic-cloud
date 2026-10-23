# TrafficCloud – Cloud-Based Traffic Management System

**A cloud-deployed web application for monitoring traffic conditions and managing road incidents.**

## Project Links

- **Live Demo:** https://traffic-cloud.onrender.com
- **GitHub Repository:** https://github.com/muthukoornandini/traffic-cloud

## Overview

TrafficCloud is a web-based application designed to support traffic monitoring and road incident management through a centralized dashboard. It demonstrates the use of modern web technologies, backend services, containerization, and cloud deployment.

The application provides interfaces for viewing traffic-related information, exploring maps, reviewing incidents, and accessing traffic analytics.

## Features

- **Traffic Dashboard:** View traffic-related information in a centralized interface.
- **Traffic Monitoring:** Explore available traffic conditions and related data.
- **Incident Management:** View and manage reported road incidents.
- **Map Visualization:** Explore traffic information through map-based interfaces.
- **Traffic Analytics:** Display traffic-related information using charts and visualizations.
- **Authentication Interface:** Provides login-related screens.
- **Admin Control Room:** Offers an interface for centralized traffic monitoring and administration.
- **Cloud Deployment:** Access the application through a public web URL.

*Note: Actual functionality depends on the implemented features and configured data sources.*

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js |
| Build Tool | Vite |
| Backend | Node.js |
| API Framework | Express.js |
| Containerization | Docker |
| Cloud Platform | Render |
| Version Control | Git and GitHub |

## System Architecture

```text
              Users
                |
                v
        React.js Frontend
                |
                v
      Node.js + Express.js API
                |
                v
    Traffic and Incident Processing
                |
                v
          Docker Image
                |
                v
        Render Cloud Platform
                |
                v
       Public Web Application
```

## How It Works

1. Users open the TrafficCloud website in a web browser.
2. The frontend displays the available traffic dashboards and application pages.
3. The backend processes supported requests from the frontend.
4. Traffic and incident information is handled according to the application's logic.
5. Docker packages the application for deployment.
6. Render hosts the application and provides a public URL.

## Getting Started

### Prerequisites

Install the following tools:

- Node.js and npm
- Git
- Visual Studio Code (recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/muthukoornandini/traffic-cloud.git
cd traffic-cloud
```

### 2. Install Dependencies and Build the Frontend

```bash
npm run setup
```

### 3. Start the Application

```bash
npm start
```

### 4. Open the Application

Visit the following address in your browser:

http://localhost:5000

Keep the terminal running while using the local application.

## Cloud Deployment

TrafficCloud is deployed on Render using Docker.

Deployment process:

1. Upload the source code to GitHub.
2. Connect the GitHub repository to Render.
3. Select Docker as the runtime environment.
4. Configure any required environment variables.
5. Deploy the application.
6. Open the public URL after the deployment succeeds.

**Live Application:** https://traffic-cloud.onrender.com

## Project Structure

```text
traffic-cloud/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── styles.css
│   ├── index.html
│   └── package.json
├── server/
│   ├── index.js
│   ├── db.js
│   ├── data.js
│   ├── sim.js
│   └── package.json
├── Dockerfile
├── .dockerignore
├── .gitignore
├── package.json
└── README.md
```

## Project Objectives

- Demonstrate cloud-based application development and deployment.
- Provide a centralized interface for traffic monitoring.
- Organize traffic incident information.
- Demonstrate frontend and backend integration.
- Understand Docker-based application deployment.
- Explore cloud-hosted web application architecture.

## Future Enhancements

- Integrate real-time traffic data from reliable traffic APIs.
- Connect a persistent cloud database for traffic records and user accounts.
- Implement secure authentication and role-based access control.
- Add location-based congestion alerts.
- Provide route recommendations based on traffic conditions.
- Improve application monitoring, security, and audit logging.

## Author

**Muthukoornandini**

- **GitHub:** https://github.com/muthukoornandini
- **Project Repository:** https://github.com/muthukoornandini/traffic-cloud

## License

This project is developed for academic and educational purposes. Add a suitable open-source license if you intend to allow others to reuse or redistribute the source code.

---

**TrafficCloud – Bringing Traffic Monitoring to the Cloud.**

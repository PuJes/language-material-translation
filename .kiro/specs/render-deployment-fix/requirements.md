# Requirements Document

## Introduction

This feature addresses the deployment configuration issues preventing the frontend from connecting to the backend on Render. The current application has hardcoded localhost URLs that work in development but fail in production, causing connection failures between the React frontend and Node.js backend services deployed on Render.

## Requirements

### Requirement 1

**User Story:** As a developer deploying to Render, I want the frontend to automatically use the correct backend URL based on the environment, so that the application works seamlessly in both development and production.

#### Acceptance Criteria

1. WHEN the application runs in development THEN the frontend SHALL connect to localhost:3001
2. WHEN the application runs in production THEN the frontend SHALL connect to the Render backend URL
3. WHEN environment variables are configured THEN the build process SHALL use the correct API endpoint
4. IF the backend URL is not accessible THEN the frontend SHALL display appropriate error messages

### Requirement 2

**User Story:** As a user accessing the deployed application, I want the WebSocket connection to work properly in production, so that I can receive real-time progress updates during file processing.

#### Acceptance Criteria

1. WHEN the frontend connects to the backend THEN WebSocket connections SHALL use the production backend URL
2. WHEN WebSocket connection fails THEN the system SHALL attempt reconnection with exponential backoff
3. WHEN in production environment THEN WebSocket SHALL use WSS (secure WebSocket) protocol
4. IF WebSocket connection is unavailable THEN the application SHALL gracefully degrade to polling

### Requirement 3

**User Story:** As a developer, I want proper CORS configuration on the backend, so that the frontend can make API calls from the Render domain without being blocked.

#### Acceptance Criteria

1. WHEN the backend receives requests from the frontend domain THEN CORS SHALL allow the connection
2. WHEN in production THEN the backend SHALL accept requests from the Render frontend URL
3. WHEN CORS is configured THEN both HTTP and WebSocket connections SHALL be allowed
4. IF an unauthorized origin attempts connection THEN the backend SHALL reject the request

### Requirement 4

**User Story:** As a developer, I want environment-specific configuration management, so that I can easily deploy to different environments without code changes.

#### Acceptance Criteria

1. WHEN building for production THEN environment variables SHALL override default values
2. WHEN deploying to Render THEN the build process SHALL use production configuration
3. WHEN running locally THEN development configuration SHALL be used automatically
4. IF environment variables are missing THEN the system SHALL use sensible defaults
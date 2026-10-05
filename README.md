# SLIIT Choir Backend

## Health Checks and Monitoring

This backend provides two endpoints for uptime monitoring and health checks:

### 1. `GET /health`
- **Purpose**: A lightweight, fast endpoint to verify that the Node.js server is running and responsive.
- **Behavior**: Returns a `200 OK` status with a simple JSON body `{"status":"ok"}`. It does not touch the database.
- **Monitoring Setup**: Configure your external uptime monitor (e.g., UptimeRobot, cron-job.org) to ping this endpoint every **5-10 minutes**. This ensures the server stays awake and handles HTTP requests.

### 2. `GET /health/db`
- **Purpose**: Verifies the connection to the MongoDB Atlas database.
- **Behavior**: Reuses the existing Mongoose connection to ping the database (`db.admin().ping()`). It returns `200 OK` (`{"status":"ok", "database":"up"}`) if the ping succeeds within 5 seconds. If it fails, times out, or the connection is dropped, it returns a `503 Service Unavailable` status and logs the error on the server side without leaking credentials.
- **Monitoring Setup**: Configure a monitor to ping this endpoint **once a day** (or once every few hours) to ensure the database connection remains healthy without adding unnecessary load.

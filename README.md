# Network Latency Monitor

A real-time network latency monitoring dashboard built with Next.js, Recharts, and InfluxDB. It features a background worker that pings multiple targets and stores the data for visualization.

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: v18 or later
- **InfluxDB**: v2.x (Local or Cloud)
- **PM2**: (Optional) For production deployment

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd net-latency-monitor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

   **Packages installed:**
   - `@influxdata/influxdb-client`: For InfluxDB communication.
   - `ping`: To perform network pings.
   - `recharts`: For data visualization.
   - `lucide-react`: For UI icons.
   - `dotenv`: To manage environment variables.
   - `next`, `react`, `react-dom`: Core web framework.

## ⚙️ Configuration

Create a `.env` file in the root directory (or edit the existing one) with the following variables:

```env
INFLUX_URL="http://localhost:8086"
INFLUX_TOKEN="your-influx-token"
INFLUX_ORG="your-org-name"
INFLUX_BUCKET="your-bucket-name"

# Comma-separated list of IP addresses or hostnames to monitor
PING_TARGETS="192.168.1.1,8.8.8.8,google.com"
```

## 🏃 Running the Application

### 1. Development Mode
Run both the web server and the worker in separate terminals:

**Terminal 1 (Web):**
```bash
npm run dev
```

**Terminal 2 (Worker):**
```bash
node worker.js
```

### 2. Production Mode (PM2)
We use PM2 to manage both processes efficiently.

**Start everything:**
```bash
pm2 start ecosystem.config.js
```

**Common PM2 Commands:**
- `pm2 status`: Check if services are running.
- `pm2 logs`: View real-time logs.
- `pm2 restart all`: Restart both web and worker.
- `pm2 save`: Save process list to restart after reboot.

## 🏗️ Architecture

- **`worker.js`**: A standalone Node.js script that pings targets every 5 seconds and writes results to InfluxDB.
- **`src/app/api/latency/route.ts`**: API endpoint that queries InfluxDB using Flux and returns formatted data for the frontend.
- **`src/app/page.tsx`**: The main dashboard UI using Recharts to display historical and real-time trends.
- **`ecosystem.config.js`**: Configuration for PM2 to run both the Next.js server and the ping worker.

## 📊 Features

- **Real-time Monitoring**: View latency trends from the last 15 minutes.
- **Historical View**: View average latency over the last 7 days.
- **Host Filtering**: Toggle specific hosts on/off in the chart.
- **Dynamic Gradients**: Auto-generated HSL colors for each host.
- **Responsive Design**: Works on mobile and desktop.

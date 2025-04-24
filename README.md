

---

## 📡 Event Stream Server with PostgreSQL, Redis, and WebSockets

This project is a real-time event streaming system built with **Node.js**, **PostgreSQL**, **Redis**, and **WebSockets**, featuring a simple **Admin UI** to subscribe and view events in real time.

---

### 🧰 Tech Stack

- Node.js
- PostgreSQL (with LISTEN/NOTIFY triggers)
- Redis (for pub/sub and recent event caching)
- WebSocket (native real-time streaming)
- Express (serving static admin UI)
- HTML + JavaScript (for the frontend admin dashboard)

---

### 🚀 Getting Started

#### 1. **Clone the Repository**

```bash
git clone https://github.com/your-username/event-stream-server.git
cd event-stream-server
```

#### 2. **Install Dependencies**

```bash
npm install
```

#### 3. **Create and Configure `.env`**

Create a `.env` file at the root of the project:

```ini
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_pg_user
DB_PASSWORD=your_pg_password
DB_NAME=your_database_name

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# WebSocket Port
WS_PORT=8080

# Admin UI HTTP Port
HTTP_PORT=3000

# Tables to Monitor
TABLES_TO_MONITOR=users,products,orders,order_items
```

> ⚠️ Ensure your PostgreSQL database is set up and triggers for `LISTEN`/`NOTIFY` are implemented on those tables.

#### 4. **Run the Server**

```bash
node index.js
```

---

### 🌐 Accessing the Admin UI

After the server starts:

- Open [http://localhost:3000](http://localhost:3000)
- You will see the `admin.html` interface
- Use the interface to subscribe to database events

---

### 🧪 Testing with PostgreSQL

You need to set up database triggers like:

```sql
CREATE OR REPLACE FUNCTION notify_table_event() RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  payload = json_build_object(
    'event_id', gen_random_uuid(),
    'table_name', TG_TABLE_NAME,
    'event_type', TG_OP,
    'data', row_to_json(NEW)
  );

  PERFORM pg_notify(TG_TABLE_NAME || '_events', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Then create triggers:

```sql
CREATE TRIGGER users_notify
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION notify_table_event();
```

Repeat for `products`, `orders`, and `order_items`.

---



### 📌 Features

- WebSocket-based event broadcasting
- Redis Pub/Sub for horizontal scalability
- PostgreSQL LISTEN/NOTIFY for minimal latency
- Lightweight Admin UI for subscriptions
- Extensible to support filtering and analytics

---

### 💡 Future Ideas

- Authentication for admin UI
- Store historical events in DB
- Per-table filtering in the frontend
- Export event logs

---

### 🧑‍💻 Author

Built with ❤️ by X-culture24

---

L

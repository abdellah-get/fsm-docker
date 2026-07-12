import { Pool } from "pg";

const globalForPg = global as unknown as { pool: Pool };

// 📍 ASTUCE : On met la chaîne de connexion en dur si le .env n'est pas détecté !
const connectionString =
  process.env.DATABASE_URL || "postgresql://admin:admin@localhost:5432/fsm_db";

const pool =
  globalForPg.pool ||
  new Pool({
    connectionString: connectionString,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pool = pool;

export default pool;

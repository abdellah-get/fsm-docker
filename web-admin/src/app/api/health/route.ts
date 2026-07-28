import { NextResponse } from "next/server";
import pool from "../../../lib/db";
import { observeHttpRequest } from "../../../lib/metrics";

export async function GET() {
  const start = process.hrtime.bigint();
  const route = "/api/health";
  const method = "GET";

  try {
    await pool.query("SELECT 1");
    const status = 200;
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    observeHttpRequest(method, route, status, durationSeconds);

    return NextResponse.json(
      { status: "OK", database: "Connected" },
      { status },
    );
  } catch (error) {
    const status = 500;
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    observeHttpRequest(method, route, status, durationSeconds);

    return NextResponse.json(
      { status: "ERROR", database: "Disconnected" },
      { status },
    );
  }
}

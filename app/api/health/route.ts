import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      message: "L'application fonctionne parfaitement !",
    },
    {
      status: 200,
    },
  );
}

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ensureDatabaseSchema } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ status: "configuration_required", database: "not_connected" }, { status: 503 });
  }

  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    const schema = await ensureDatabaseSchema(db);
    return NextResponse.json({ status: "ok", database: db.databaseName, schema });
  } catch {
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}

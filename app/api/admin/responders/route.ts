import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const {
      data: responders,
      error,
    } = await supabaseAdmin
      .from("responders")
      .select(
        `
          id,
          full_name,
          agency,
          phone,
          status,
          availability,
          created_at
        `,
      )
      .order("created_at", {
        ascending: false,
      });


    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        },
      );
    }


    return NextResponse.json(
      {
        responders:
          responders ?? [],
      },
      {
        status: 200,
      },
    );


  } catch (error) {

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load responders.",
      },
      {
        status: 500,
      },
    );

  }
}
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";


export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {

  try {

    const {
      id,
    } =
      await context.params;



    if (!id) {

      return NextResponse.json(
        {
          error:
            "Responder ID is required.",
        },
        {
          status: 400,
        },
      );

    }



    const body =
      await request.json();



    const status =
      body.status;



    if (
      status !== "Active" &&
      status !== "Inactive"
    ) {

      return NextResponse.json(
        {
          error:
            "Invalid responder status.",
        },
        {
          status:400,
        },
      );

    }




    const availability =
      status === "Active"
        ? "Available"
        : "Offline";




    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("responders")
        .update({
          status,
          availability,
        })
        .eq(
          "id",
          id,
        )
        .select(
          `
            id,
            full_name,
            agency,
            phone,
            status,
            availability
          `,
        )
        .single();




    if (error) {

      console.error(
        "Update responder status error:",
        error,
      );


      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status:500,
        },
      );

    }




    return NextResponse.json(
      {
        message:
          "Responder status updated successfully.",
        responder:data,
      },
      {
        status:200,
      },
    );



  } catch (error) {

    console.error(
      "Responder status API error:",
      error,
    );


    return NextResponse.json(
      {
        error:
          "Unable to update responder status.",
      },
      {
        status:500,
      },
    );

  }

}
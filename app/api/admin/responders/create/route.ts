import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";


export async function POST(
  request: Request,
) {

  try {

    const body =
      await request.json();



    const {
      email,
      password,
      full_name,
      agency,
      phone,
    } = body;



    if (
      !email ||
      !password ||
      !full_name
    ) {

      return NextResponse.json(
        {
          error:
            "Email, password, and full name are required.",
        },
        {
          status:400,
        },
      );

    }




    /*
     * Create Supabase Auth account
     *
     * Email confirmation is required.
     * Responder must verify email before login.
     */
    const {
      data: authUser,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email,

          password,


          email_confirm: false,


          user_metadata:{
            role:"responder",
          },

        },
      );




    if (authError) {

      return NextResponse.json(
        {
          error:
            authError.message,
        },
        {
          status:400,
        },
      );

    }




    if (
      !authUser.user
    ) {

      return NextResponse.json(
        {
          error:
            "Unable to create authentication account.",
        },
        {
          status:500,
        },
      );

    }




    /*
     * Create responder profile
     */
    const {
      error: responderError,
    } =
      await supabaseAdmin
        .from("responders")
        .insert({

          auth_id:
            authUser.user.id,


          full_name,


          agency:
            agency || null,


          phone:
            phone || null,


          /*
           * Account status
           */
          status:
            "Active",


          /*
           * Operational availability
           */
          availability:
            "Offline",

        });




    if (responderError) {


      /*
       * Cleanup auth account
       * if profile creation fails
       */
      await supabaseAdmin.auth.admin.deleteUser(
        authUser.user.id,
      );



      return NextResponse.json(
        {
          error:
            responderError.message,
        },
        {
          status:400,
        },
      );

    }




    return NextResponse.json(
      {
        message:
          "Responder created successfully. Verification email sent.",
      },
      {
        status:201,
      },
    );



  } catch(error) {


    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error.",
      },
      {
        status:500,
      },
    );

  }

}
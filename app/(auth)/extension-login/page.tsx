// app/auth/extension-login/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function ExtensionLogin() {
  const router = useRouter();

  useEffect(() => {
    // 1) Read the `token` param from the URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      // No token present → send user to homepage
      router.replace("/");
      return;
    }

    // 2) Initialize a Supabase client (same keys you already use)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,       // store session in cookie/localStorage
        detectSessionInUrl: false,  // we handle this manually
      },
    });

    // 3) Set the session using the passed JWT
    supabase.auth
      .setSession({ access_token: token, refresh_token: "" })
      .then(({ error }) => {
        if (error) {
          console.error("Extension login failed:", error.message);
          // If something goes wrong, just redirect to "/"
          router.replace("/");
        } else {
          // 4) Redirect into your main app
          router.replace("/");
        }
      });
  }, [router]);

  // While we’re setting the session/redirecting, render nothing (or a loader)
  return null;
}

"use server";

export async function verifyTurnstile(token: string) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("Turnstile Secret Key is missing");
    return { success: false, message: "Server configuration error" };
  }

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      },
    );

    const outcome = await result.json();

    if (outcome.success) {
      return { success: true };
    } else {
      console.error("Turnstile validation failed:", outcome);
      return { success: false, message: "Verification failed" };
    }
  } catch (err) {
    console.error("Turnstile error:", err);
    return { success: false, message: "Connection error" };
  }
}

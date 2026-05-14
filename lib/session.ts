import type { SessionOptions } from "iron-session";

export const sessionOptions: SessionOptions = {
  password:
    process.env.IRON_SESSION_PASSWORD ??
    "dev-only-change-me-32chars-minimum!!",
  cookieName: "srms_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
  },
};

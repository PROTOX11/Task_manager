export interface GoogleSignupProfile {
  credential: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar: string;
}

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof window === "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }

  return window.atob(padded);
};

export const decodeGoogleSignupProfile = (credential: string): GoogleSignupProfile | null => {
  try {
    const [, payload] = credential.split(".");

    if (!payload) {
      return null;
    }

    const parsed = JSON.parse(decodeBase64Url(payload)) as {
      email?: string;
      name?: string;
      picture?: string;
      given_name?: string;
      family_name?: string;
    };

    const email = parsed.email?.trim();

    if (!email) {
      return null;
    }

    const fullName = parsed.name?.trim() || email.split("@")[0];
    const nameParts = fullName.split(/\s+/);
    const firstName = parsed.given_name?.trim() || nameParts[0] || "User";
    const lastName = parsed.family_name?.trim() || nameParts.slice(1).join(" ");

    return {
      credential,
      email,
      name: fullName,
      firstName,
      lastName,
      avatar: parsed.picture?.trim() || "",
    };
  } catch {
    return null;
  }
};

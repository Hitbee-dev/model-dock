export type CloudflareAccessConfig = {
  enabled: boolean;
  teamDomain: string;
  allowedAudiences: string[];
  allowedEmails?: string[];
};

export type CloudflareAccessClaims = {
  email: string;
  aud: string[];
  iss: string;
  exp: number;
};

export type CloudflareAccessVerifier = {
  verifyJwt(jwt: string): Promise<CloudflareAccessClaims>;
};

export type CloudflareAccessDecision = {
  allowed: boolean;
  email?: string;
  reason?: string;
};

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function verifyCloudflareAccess(input: {
  headers: Record<string, string | string[] | undefined>;
  config: CloudflareAccessConfig;
  verifier: CloudflareAccessVerifier;
  nowEpochSeconds: number;
}): Promise<CloudflareAccessDecision> {
  if (!input.config.enabled) {
    return { allowed: true, reason: "disabled" };
  }

  const jwt = headerValue(input.headers["cf-access-jwt-assertion"]);
  if (!jwt) {
    return { allowed: false, reason: "missing_cf_access_jwt" };
  }

  let claims: CloudflareAccessClaims;
  try {
    claims = await input.verifier.verifyJwt(jwt);
  } catch {
    return { allowed: false, reason: "invalid_cf_access_jwt" };
  }
  const expectedIssuer = `https://${input.config.teamDomain}`;
  if (claims.iss !== expectedIssuer) {
    return { allowed: false, reason: "invalid_cf_access_issuer" };
  }
  if (claims.exp <= input.nowEpochSeconds) {
    return { allowed: false, reason: "expired_cf_access_jwt" };
  }
  if (!claims.aud.some((audience) => input.config.allowedAudiences.includes(audience))) {
    return { allowed: false, reason: "invalid_cf_access_audience" };
  }
  if (input.config.allowedEmails?.length && !input.config.allowedEmails.includes(claims.email)) {
    return { allowed: false, reason: "email_not_allowed" };
  }

  return { allowed: true, email: claims.email };
}

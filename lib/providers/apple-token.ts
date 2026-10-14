import { SignJWT, importPKCS8 } from "jose"

export interface AppleMusicCredentials {
  teamId: string
  keyId: string
  privateKey: string
}

export function readAppleMusicCredentials(env: NodeJS.ProcessEnv = process.env): AppleMusicCredentials | null {
  const teamId = env.APPLE_TEAM_ID?.trim()
  const keyId = env.APPLE_KEY_ID?.trim()
  const privateKey = env.APPLE_PRIVATE_KEY?.trim()
  if (!teamId || !keyId || !privateKey) return null
  return {
    teamId,
    keyId,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  }
}

/** MusicKit developer tokens are ES256 JWTs. Apple allows up to 180 days. */
export async function signAppleDeveloperToken(input: AppleMusicCredentials & { expiresIn?: string }): Promise<string> {
  const key = await importPKCS8(input.privateKey.replace(/\\n/g, "\n"), "ES256")
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: input.keyId })
    .setIssuer(input.teamId)
    .setIssuedAt()
    .setExpirationTime(input.expiresIn ?? "180d")
    .sign(key)
}

import type { OtpChallenge, OtpProvider } from "./otp-provider.js";

export class InMemoryOtpProvider implements OtpProvider {
  private readonly challenges = new Map<string, OtpChallenge>();

  async store(challenge: OtpChallenge): Promise<void> {
    this.challenges.set(challenge.email.toLowerCase(), { ...challenge });
  }

  async consume(email: string, code_hash: string, now: Date): Promise<boolean> {
    const key = email.toLowerCase();
    const challenge = this.challenges.get(key);
    if (!challenge) return false;
    if (challenge.code_hash !== code_hash) return false;
    if (Date.parse(challenge.expires_at) <= now.getTime()) {
      this.challenges.delete(key);
      return false;
    }
    this.challenges.delete(key);
    return true;
  }
}

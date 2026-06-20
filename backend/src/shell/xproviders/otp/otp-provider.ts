export interface OtpChallenge {
  email: string;
  code_hash: string;
  expires_at: string;
}

export interface OtpProvider {
  store(challenge: OtpChallenge): Promise<void>;
  consume(email: string, code_hash: string, now: Date): Promise<boolean>;
}

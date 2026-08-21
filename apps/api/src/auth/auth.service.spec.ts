import { AuthService } from './auth.service';

describe('AuthService OTP challenge lifecycle', () => {
  beforeAll(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-only-encryption-key-at-least-32-chars';
  });

  it('keeps an outstanding OTP valid when an unauthenticated resend is requested', () => {
    const service = new AuthService({} as never);
    const first = service.generateOtp('9876543210');
    const resend = service.generateOtp('9876543210');
    expect(first.otp).toMatch(/^\d{6}$/);
    expect(resend.otp).toBe(first.otp);
    expect(service.verifyOtp('9876543210', first.otp!)).toEqual({
      valid: true,
      message: 'OTP verified successfully.',
    });
  });

  it('issues distinct challenges to different mobile numbers', () => {
    const service = new AuthService({} as never);
    const first = service.generateOtp('9876543210');
    const second = service.generateOtp('9876543211');
    expect(first.otp).toMatch(/^\d{6}$/);
    expect(second.otp).toMatch(/^\d{6}$/);
    expect(service.verifyOtp('9876543211', second.otp!)).toEqual({
      valid: true,
      message: 'OTP verified successfully.',
    });
  });
});

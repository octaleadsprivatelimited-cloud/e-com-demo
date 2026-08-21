import { AuthService } from './auth.service';

describe('AuthService OTP challenge lifecycle', () => {
  beforeAll(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-only-encryption-key-at-least-32-chars';
    process.env.EXPOSE_TEST_OTP = 'true';
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

  it('limits customer tokens to four hours while privileged roles stay shorter', () => {
    const sign = jest.fn().mockReturnValue('signed-token');
    const service = new AuthService({ sign } as never);

    service.issueToken({ mobile: '9876543210', id: 'CUS-1', role: 'customer' });
    expect(sign).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: 'customer' }),
      { expiresIn: '4h' },
    );

    service.issueToken({ mobile: 'admin', id: 'admin', role: 'admin' });
    expect(sign).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: 'admin' }),
      { expiresIn: '2h' },
    );
  });
});

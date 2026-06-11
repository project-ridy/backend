export interface SmsSender {
  sendVerificationCode(phone: string, code: string): Promise<void>;
}

export class ConsoleSmsSender implements SmsSender {
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    await Promise.resolve();
    // TODO: CoolSMS/NCP SMS 등 실제 SMS provider adapter로 교체한다.
    // 인증 코드는 운영 로그에 남기지 않아야 하므로 개발 환경에서만 사용한다.
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[sms:dev] phone=${phone} code=${code}`);
    }
  }
}

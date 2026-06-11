import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

function sourceFile(path: string): string {
  return readFileSync(join(SRC_ROOT, path), 'utf8');
}

describe('MSA 프로젝트 구조', () => {
  it('GraphQL Gateway와 bounded context 디렉토리를 가진다', () => {
    const requiredDirectories = [
      'app',
      'gateway/graphql',
      'common/context',
      'common/events',
      'common/health',
      'services/auth',
      'services/company',
      'services/matching',
      'services/chat',
      'services/payment',
      'services/analytics',
      'services/notification',
    ];

    for (const directory of requiredDirectories) {
      expect(existsSync(join(SRC_ROOT, directory))).toBe(true);
    }
  });

  it('AppModule은 Gateway와 bounded context 모듈을 조립한다', () => {
    const appModule = sourceFile('app/app.module.ts');

    expect(appModule).toContain('GraphQLGatewayModule');
    expect(appModule).toContain('AuthServiceModule');
    expect(appModule).toContain('CompanyServiceModule');
    expect(appModule).toContain('MatchingServiceModule');
    expect(appModule).toContain('ChatServiceModule');
    expect(appModule).toContain('PaymentServiceModule');
    expect(appModule).toContain('AnalyticsServiceModule');
    expect(appModule).toContain('NotificationServiceModule');
  });

  it('초대 코드 기능은 Company bounded context 안에 위치한다', () => {
    expect(existsSync(join(SRC_ROOT, 'services/company/invite-code/invite-code.module.ts'))).toBe(
      true,
    );
    expect(existsSync(join(SRC_ROOT, 'modules/invite-code/invite-code.module.ts'))).toBe(false);
  });

  it('도메인 이벤트 버스 추상화와 in-memory 구현을 제공한다', () => {
    const eventBus = sourceFile('common/events/domain-event-bus.ts');
    const inMemoryEventBus = sourceFile('common/events/in-memory-domain-event-bus.ts');

    expect(eventBus).toContain('DOMAIN_EVENT_BUS');
    expect(eventBus).toContain('DomainEventBus');
    expect(inMemoryEventBus).toContain('InMemoryDomainEventBus');
    expect(inMemoryEventBus).toContain('publish');
  });
});

import { buildSponsorInquiryEmail } from './sponsor-inquiry-email.template';

describe('Partner inquiry email terminology', () => {
  it('uses partnership copy while retaining inquiry content and safe escaping', () => {
    const html = buildSponsorInquiryEmail({ inquiry: { fullName: 'Тест Купац', companyName: '<Test>', email: 'test@example.invalid', message: 'Партнерски упит', sponsorshipPackage: 'Главни партнер', consent: true }, submittedAt: new Date('2026-09-17T12:00:00Z'), replyToEnabled: true });
    expect(html).toContain('Нови упит за партнерство');
    expect(html).toContain('Главни партнер');
    expect(html).toContain('&lt;Test&gt;');
    expect(html).not.toMatch(/спонзорство|пријатеља клуба/);
  });
});

import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { MailService } from './mail.service';
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }));
describe('Reusable SMTP transport (no network)', () => {
  it('keeps the SMTP contract and reuses one transport for sponsor and order messages', async () => {
    const sendMail = jest.fn().mockResolvedValue({ accepted: ['test@example.invalid'] });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    const mail = new MailService(new ConfigService({ SMTP_HOST: 'smtp.example.invalid', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'test@example.invalid', SMTP_PASS: 'isolated-secret' }));
    const sponsor = { to: 'test@example.invalid', from: 'test@example.invalid', subject: 'Упит', html: '<p>Тест</p>', attachments: [] };
    const order = { to: 'test@example.invalid', from: 'test@example.invalid', subject: 'Поруџбина', text: 'Тест' };
    await mail.send(sponsor); await mail.send(order);
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.example.invalid', port: 465, secure: true, auth: { user: 'test@example.invalid', pass: 'isolated-secret' } }));
    expect(sendMail.mock.calls).toEqual([[sponsor], [order]]);
  });
});

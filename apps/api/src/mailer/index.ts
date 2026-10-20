import config from '@/config';
import { logger } from '@/logger';
import Handlebars from 'handlebars';
import { readFile } from 'node:fs/promises';
import nodemailer from 'nodemailer';

export type MailTemplate = {
  title: string;
  verifyCode: string;
};

const transporter = nodemailer.createTransport({
  host: config.mailer.host,
  port: config.mailer.port,
  secure: config.mailer.secure,
  auth: config.mailer.auth.user
    ? {
        user: config.mailer.auth.user,
        pass: config.mailer.auth.password,
      }
    : undefined,
});

const src = await readFile(new URL('./template.html', import.meta.url), 'utf8');

const tmpl = Handlebars.compile(src);
export const sendVerifyMail = async (
  to: string,
  template: MailTemplate,
): Promise<boolean> => {
  const html = tmpl({
    verifyCode: template.verifyCode,
  });
  try {
    const message = await transporter.sendMail({
      from: config.mailer.from,
      to,
      subject: template.title,
      html,
    });

    return message.accepted.length > 0;
  } catch (e) {
    logger.error(e);
    return false;
  }
};

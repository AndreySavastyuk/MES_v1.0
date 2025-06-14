import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    path: string;
  }[];
}

export class EmailService {
  private config: EmailConfig | null = null;

  configure(config: EmailConfig) {
    this.config = config;
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.config) {
      return {
        success: false,
        error: 'Email service не настроен'
      };
    }

    try {
      console.log('Отправка email:', options);
      
      // Заглушка для отправки email
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка отправки email'
      };
    }
  }

  async sendReportEmail(to: string[], reportPaths: string[], reportType: string): Promise<boolean> {
    const attachments = reportPaths.map(path => ({
      filename: path.split('/').pop() || 'report',
      path
    }));

    const result = await this.sendEmail({
      to,
      subject: `Отчет: ${reportType}`,
      text: `Во вложении отчет: ${reportType}`,
      attachments
    });

    return result.success;
  }
}

export default new EmailService();
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { toEmail, subject, html } = await req.json();

    if (!toEmail || !html) {
      return NextResponse.json(
        { error: 'Email destinatario y contenido HTML requeridos.' },
        { status: 400 }
      );
    }

    // Check if custom SMTP exists in environment
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      // Send via real SMTP server
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'AD Media Solution'}" <${process.env.SMTP_FROM_EMAIL || smtpUser}>`,
        to: toEmail,
        subject: subject || 'Prueba de Email',
        html: html,
      });

      return NextResponse.json({
        success: true,
        isVirtual: false,
        message: `Correo de prueba enviado de forma real a ${toEmail}.`,
      });
    } else {
      // Fallback: Create test account on Ethereal Mail dynamically
      console.log('No custom SMTP config found. Creating virtual Ethereal Mail account...');
      const testAccount = await nodemailer.createTestAccount();

      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await transporter.sendMail({
        from: '"AD Media Solution Email Builder" <test@admediasolution.com>',
        to: toEmail,
        subject: subject || 'Prueba de Email (Virtual)',
        html: html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);

      return NextResponse.json({
        success: true,
        isVirtual: true,
        previewUrl: previewUrl,
        message: `Bandeja virtual creada. Puedes ver cómo renderiza en el cliente de correo real.`,
      });
    }
  } catch (error) {
    console.error('Error in send-test API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al enviar el correo de prueba.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { ZodError } from 'zod';
import { documentToContent } from '@/lib/email-document';
import { renderEmail } from '@/lib/templates';
import { sendTestRequestSchema, validationMessage } from '@/lib/server/api-schemas';
import { requireUser, AuthenticationError } from '@/lib/server/auth';
import { getBrandById } from '@/lib/server/brandStore';
import type { EmailDocumentV3, EmailDocumentV4 } from '@/lib/types';

function plainText(document: EmailDocumentV3 | EmailDocumentV4): string {
  return document.blocks.flatMap(block => {
    if (block.type === 'text') return [block.headline, block.body];
    if (block.type === 'bullets') return [block.bulletsTitle, ...block.bullets];
    if (block.type === 'cta') return [block.preCta, block.ctaText];
    if (block.type === 'quote') return [block.text, block.author];
    return [];
  }).filter(Boolean).join('\n\n');
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const input = sendTestRequestSchema.parse(await req.json());
    const brand = await getBrandById(input.document.brandId);
    if (!brand) return NextResponse.json({ error: 'Marca no encontrada' }, { status: 400 });
    const html = renderEmail(brand, documentToContent(input.document));
    if (html.length > 350_000) return NextResponse.json({ error: 'El email supera el tamaño permitido' }, { status: 400 });

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    let transporter: nodemailer.Transporter;
    let isVirtual = false;
    if (host && user && pass) {
      transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    } else if (process.env.NODE_ENV !== 'production' && process.env.EMAILBUILDER_ENABLE_ETHEREAL === 'true') {
      const account = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, secure: false, auth: { user: account.user, pass: account.pass } });
      isVirtual = true;
    } else {
      return NextResponse.json({ error: 'SMTP no está configurado en el servidor' }, { status: 503 });
    }

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'AD Media Solution'}" <${process.env.SMTP_FROM_EMAIL || user}>`,
      to: input.toEmail,
      subject: input.document.subject,
      html,
      text: plainText(input.document),
    });
    return NextResponse.json({ success: true, isVirtual, previewUrl: isVirtual ? nodemailer.getTestMessageUrl(info) : undefined });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: validationMessage(error) }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al enviar la prueba' }, { status: 500 });
  }
}

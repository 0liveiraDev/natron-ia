"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcome = sendWelcome;
exports.sendPasswordResetCode = sendPasswordResetCode;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Create transporter using environment variables from production setup
const transporter = nodemailer_1.default.createTransport({
    host: process.env.MAIL_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.MAIL_PORT || '465', 10),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});
const FROM = process.env.MAIL_FROM || 'Natron IA / Trilha IA <contato@natron.site>';
const APP_URL = process.env.APP_URL || 'https://natron.site';
// ? HTML Base Template inspired by the dark minimalist gamified theme
function baseTemplate(content) {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background: #000000; margin: 0; padding: 0; color: #ffffff; }
    .container { max-width: 600px; margin: 40px auto; background: #111111; border-radius: 8px; border: 1px solid #333; overflow: hidden; }
    .header { background: #1a1a1a; padding: 32px; text-align: center; border-bottom: 1px solid #333; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: -0.02em; }
    .body { padding: 40px 32px; color: #cccccc; line-height: 1.7; }
    .code-box { background: #000000; border-left: 4px solid #ff4400; padding: 20px; text-align: center; margin: 24px 0; border-radius: 4px; }
    .code { font-size: 36px; font-weight: bold; color: #ff4400; letter-spacing: 12px; }
    .btn { display: inline-block; background: #ff4400; color: #ffffff !important; padding: 14px 32px; border-radius: 4px; text-decoration: none; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0; }
    .footer { background: #1a1a1a; padding: 24px 32px; text-align: center; font-size: 13px; color: #666666; border-top: 1px solid #333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Natron IA</h1>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      © ${new Date().getFullYear()} Natron IA · Todos os Direitos Reservados<br>
      Este é um e-mail automático, por favor não responda.
    </div>
  </div>
</body>
</html>`;
}
// ? E-mail de Boas-Vindas
async function sendWelcome(user) {
    await transporter.sendMail({
        from: FROM,
        to: user.email,
        subject: `Bem-vindo(a) ao Natron IA, ${user.name}! 🚀`,
        html: baseTemplate(`
      <h2 style="color:#ffffff">Olá, ${user.name}!</h2>
      <p>O seu registro foi concluído com sucesso e a partir de agora você faz parte Oficialmente do <strong>Natron IA</strong>.</p>
      <p>Sua jornada começa agora. Evolua seus hábitos, gerencie seu financeiro da maneira mais imersiva, aumente seus status e seja produtivo!</p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${APP_URL}/dashboard" class="btn">Entrar no Dashboard</a>
      </div>
      <p style="color:#888888; font-size:13px">Caso tenha alguma dúvida, acesso o suporte pela plataforma.</p>
    `)
    });
}
// ? E-mail do Código de Redefinição de Senha
async function sendPasswordResetCode(email, code) {
    await transporter.sendMail({
        from: FROM,
        to: email,
        subject: 'Código de Recuperação de Senha — Natron IA',
        html: baseTemplate(`
      <h2 style="color:#ffffff">Recuperação de Senha</h2>
      <p>Você solicitou uma redefinição da senha para a sua conta.</p>
      <p>Use o código de ativação abaixo para continuar. Esse código é válido por apenas <strong>15 minutos</strong>.</p>
      <div class="code-box">
        <div class="code">${code}</div>
      </div>
      <p style="color:#888888; font-size:13px">Se você não solicitou isso, pode ignorar este e-mail tranquilamente. O seu acesso permanecerá seguro.</p>
    `)
    });
}

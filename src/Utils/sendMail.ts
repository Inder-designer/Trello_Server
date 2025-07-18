import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail', // or your SMTP
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

export default async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
    await transporter.sendMail({
        from: `"Trello Clone" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
    });
}

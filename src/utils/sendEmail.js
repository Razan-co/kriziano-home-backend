const mailer = require('nodemailer')
const { config } = require('dotenv')
config()


const sendEmail = async options => {
    const transport = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        }
    }
    const transporter = mailer.createTransport(transport, {
        logger: true,
        debug: true
    })

    const message = {
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    }

    try {
        await transporter.sendMail(message);
        return { status: "Success", message: "Email sent" };
    } catch (error) {
        return { status: "Failure", message: "Error sending email" };
    }

}
module.exports = sendEmail
const nodemailer = require("nodemailer");
class Mailer {
    constructor(To, subject) {
        this.email = "noreply@sexypanel.com";
        this.smtp = nodemailer.createTransport({
            host: process.env.SMTP,
            port: process.env.PORT,
            secure: false, // true for 465, false for other ports
            auth: {
              user: process.env.USERMAIL, 
              pass: process.env.PASSMAIL, 
            },
          });
        this.To = To;
        this.body = null;
        this.subject = subject;
    };

    setBody(html){
        this.body = html;
    }

    getBody(){
        return this.body;
    }

    async Send(body){
        if(body) this.setBody(body);
        if(this.body && this.To && this.subject){
            this.smtp.sendMail({
                from: `"BKY" ${this.email}`,
                to: this.To,
                subject: this.subject, 
                html: this.body,
            }).catch(console.error);
        }
    }
}

module.exports = Mailer;
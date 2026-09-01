# Flow journal recovery email

Journal password recovery sends a one-time verification link through SMTP.

For Gmail, put these values in your local `.env` (and the same values in Vercel Environment Variables):

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-gmail-address@gmail.com"
SMTP_PASSWORD="your-gmail-app-password"
SMTP_FROM="your-gmail-address@gmail.com"
```

`SMTP_PASSWORD` must be the mail account's SMTP/app password, not the Google OAuth client secret. Keep all secrets out of Git.

After changing the values, restart the Next.js server so the environment variables are reloaded.


## Gmail setup that works

Use the Gmail account that will send recovery mail as `SMTP_USER`. Do not use the Google OAuth client secret here. `SMTP_PASSWORD` must be a Gmail App Password from the same account. The application automatically uses Nodemailer's Gmail service preset when `SMTP_USER` ends in `@gmail.com`, so the recipient can be any normal email address.

Required values:

```env
SMTP_USER="yourgmail@gmail.com"
SMTP_PASSWORD="your-16-character-app-password"
SMTP_FROM="yourgmail@gmail.com"
```

`SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE` can remain as shown in `.env.example`; the Gmail preset takes care of the transport settings.

## Delivery note
A successful SMTP send means Gmail accepted the message for delivery; it does not guarantee Inbox placement. If the API reports success but you do not see the message, check Spam/Promotions and Gmail's sent mail. The app now verifies that the target recipient was accepted and logs the message ID on the server.

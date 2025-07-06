import { ICreateAccount, IResetPassword } from '../types/emailTamplate';

const createAccount = (values: ICreateAccount) => {
  const data = {
    to: values.email,
    subject: 'Verify your account',
    html: `<body style="font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 30px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <!-- Header with brand color and text -->
        <div style="background-color: #62C1BF; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">Welcome to Crypto Education</h1>
        </div>
        
        <!-- Content area -->
        <div style="padding: 32px; background-color: #ffffff;">
            <h2 style="color: #2d3748; margin-top: 0; font-size: 20px;">Let's Get You Verified!</h2>
            
            <p style="color: #4a5568; line-height: 1.5; margin-bottom: 24px;">
                Hi ${values.name},<br>
                Thank you for joining our platform. Here's your one-time verification code:
            </p>
            
            <!-- OTP Display -->
            <div style="background-color: #f0fdfa; border: 1px dashed #62C1BF; 
                        border-radius: 8px; padding: 16px; text-align: center; 
                        margin: 0 auto 24px; width: fit-content;">
                <span style="font-size: 28px; font-weight: bold; letter-spacing: 2px; 
                            color: #2d3748;">${values.otp}</span>
            </div>
            
            <p style="color: #4a5568; line-height: 1.5; margin-bottom: 8px;">
                ⏳ This code expires in 20 minutes
            </p>
            
            <div style="border-top: 1px solid #edf2f7; margin: 24px 0; padding-top: 16px;">
                <p style="color: #718096; font-size: 14px; line-height: 1.5;">
                    If you didn't request this code, please ignore this email or contact our support team.
                </p>
            </div>
            
            <p style="color: #62C1BF; font-size: 14px; margin-bottom: 0;">
                Happy Learning!<br>
                The Crypto Education Team
            </p>
        </div>
    </div>
</body>`,
  };
  return data;
};

const resetPassword = (values: IResetPassword) => {
  const data = {
    to: values.email,
    subject: 'Reset your password',
    html: `<body style="font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 30px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <!-- Header with brand color -->
        <div style="background-color: #62C1BF; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">Password Reset Request</h1>
        </div>
        
        <!-- Content area -->
        <div style="padding: 32px; background-color: #ffffff;">
            <h2 style="color: #2d3748; margin-top: 0; font-size: 20px;">Secure Your Account</h2>
            
            <p style="color: #4a5568; line-height: 1.5; margin-bottom: 24px;">
                Hi,<br>
                We received a request to reset your password. Use this one-time code to verify your identity:
            </p>
            
            <!-- OTP Display -->
            <div style="background-color: #f0fdfa; border: 1px dashed #62C1BF; 
                        border-radius: 8px; padding: 16px; text-align: center; 
                        margin: 0 auto 24px; width: fit-content;">
                <span style="font-size: 28px; font-weight: bold; letter-spacing: 2px; 
                            color: #2d3748;">${values.otp}</span>
            </div>
            
            <p style="color: #4a5568; line-height: 1.5; margin-bottom: 8px;">
                ⏳ Expires in 20 minutes
            </p>
            
            <div style="border-top: 1px solid #edf2f7; margin: 24px 0; padding-top: 16px;">
                <p style="color: #718096; font-size: 14px; line-height: 1.5;">
                    <strong>Note:</strong> If you didn't request this, your account may be at risk. 
                    Please secure your email and contact our support team immediately.
                </p>
            </div>
            
            <p style="color: #62C1BF; font-size: 14px; margin-bottom: 0;">
                Stay Secure,<br>
                The Crypto Education Team
            </p>
        </div>
    </div>
</body>`,
  };
  return data;
};

export const emailTemplate = {
  createAccount,
  resetPassword,
};

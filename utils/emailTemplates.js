// utils/emailTemplates.js
const getPasswordResetEmail = (resetLink) => {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: auto; border-radius: 10px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); background-color: #ffffff;">
        
        <h2 style="color: #007bff; text-align: center;">🔑 Password Reset Request</h2>
        
        <p style="font-size: 16px; color: #333;">Hello,</p>
        
        <p style="font-size: 16px; color: #333;">
          We received a request to reset your password for <strong>CollabHub</strong>. No worries, we've got you covered! 🎯
        </p>
        
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetLink}" 
            style="background-color: #007bff; color: #ffffff; padding: 12px 20px; text-decoration: none; font-size: 16px; border-radius: 5px; display: inline-block;">
            🔄 Reset Password
          </a>
        </div>
  
        <p style="font-size: 16px; color: #333;">
          This link is valid for <strong>1 hour</strong>. If you didn’t request this, feel free to ignore this email. Your account is safe. 🔒
        </p>
  
        <p style="font-size: 16px; color: #333;">Happy collaborating! 🚀</p>
  
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
  
        <p style="text-align: center; font-size: 14px; color: #777;">
          ⚡ The CollabHub Team  
          <br>Need help? <a href="mailto:support@collabhub.com" style="color: #007bff; text-decoration: none;">Contact Us</a>
        </p>
  
      </div>
    `;
  };
  
  module.exports = { getPasswordResetEmail };
  
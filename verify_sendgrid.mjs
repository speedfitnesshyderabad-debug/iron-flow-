// Standalone script to verify SendGrid API key and sender email.

// CONFIGURATION
// Replace with your SendGrid API Key
const SENDGRID_API_KEY = 'YOUR_SENDGRID_API_KEY'; // Replace with a valid key

// Replace with your verified sender email
const FROM_EMAIL = 'support@speedfitness.org'; 

// Replace with your personal email to receive the test
const TO_EMAIL = 'krishnatanniru009@gmail.com'; 

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

async function sendTestEmail() {
    console.log(`🚀 Sending test email from ${FROM_EMAIL} to ${TO_EMAIL}...`);

    const payload = {
        personalizations: [{ to: [{ email: TO_EMAIL }] }],
        from: {
            email: FROM_EMAIL,
            name: 'IronFlow Test Sender',
        },
        subject: 'IronFlow x SendGrid Verification',
        content: [
            {
                type: 'text/html',
                value: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #3b82f6;">SendGrid Verification Successful!</h2>
                        <p>This is a test email sent from the <b>IronFlow</b> system using your new API key.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #666;">Timestamp: ${new Date().toLocaleString()}</p>
                    </div>
                `,
            },
        ],
    };

    try {
        const response = await fetch(SENDGRID_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok || response.status === 202) {
            console.log('✅ SUCCESS: SendGrid accepted the request! Check your inbox.');
        } else {
            const error = await response.json();
            console.error(`❌ FAILED: SendGrid returned ${response.status}`);
            import('fs').then(fs => {
                fs.writeFileSync('sendgrid_error.log', JSON.stringify(error, null, 2));
                console.log('Detailed error log written to sendgrid_error.log');
            });
            
            if (response.status === 401) {
                console.log('\n💡 TIP: Check if your API Key is correct and has "Mail Send" permissions.');
            } else if (response.status === 403) {
                console.log('\n💡 TIP: Check if the "From" email address is verified in your SendGrid console.');
            }
        }
    } catch (err) {
        console.error('❌ ERROR: An error occurred during the request:', err.message);
    }
}

sendTestEmail();

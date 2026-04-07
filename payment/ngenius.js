// N-Genius Payment Gateway Integration for Mirruba Jewelry
// Add this to your website's JavaScript

const NGeniusConfig = {
    apiKey: 'YTkwNjZmZmItZmYzNi00Nzg5LTg1OWEtMzEwNjhiNjVjZjE0OjcwZGFiOTdlLTYyMGMtNDk5NS1hNDBjLTMyNWY2ZGIyNzE4ZQ==',
    outletReference: '7c6baf08-eb0e-459e-a8d4-c5f16193b59d',
    environment: 'live',
    currency: 'AED'
};

// Identity endpoint
const IDENTITY_URL = 'https://api-gateway.ngenius-payments.com/identity/auth/access-token';

// Payment endpoint
const ORDER_URL = `https://api-gateway.ngenius-payments.com/transactions/outlets/${NGeniusConfig.outletReference}/orders`;

// Get access token
async function getNGeniusToken() {
    const response = await fetch(IDENTITY_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + NGeniusConfig.apiKey,
            'Content-Type': 'application/vnd.ni-identity.v1+json'
        }
    });
    const data = await response.json();
    return data.access_token;
}

// Create payment order
async function createNGeniusOrder(amount, orderRef, customerEmail, customerName) {
    const token = await getNGeniusToken();
    
    const orderData = {
        action: 'SALE',
        amount: {
            currencyCode: NGeniusConfig.currency,
            value: amount
        },
        language: 'en',
        merchantOrderReference: orderRef,
        merchantAttributes: {
            redirectUrl: `https://mirruba-jewellery.com/payment/success.htm?order_ref=${orderRef}`
        },
        customerEmail: customerEmail,
        customerName: customerName
    };
    
    const response = await fetch(ORDER_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/vnd.ni-payment.v2+json',
            'Accept': 'application/vnd.ni-payment.v2+json'
        },
        body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    
    if (result._links && result._links.payment) {
        return {
            success: true,
            paymentUrl: result._links.payment.href,
            orderReference: result.reference
        };
    }
    
    return {
        success: false,
        error: result.message || 'Failed to create payment'
    };
}

// Main payment function - call this from your checkout
async function processPayment(orderData) {
    // orderData should contain: amount, orderRef, customerEmail, customerName
    
    const amountInCents = Math.round(orderData.amount * 100); // Convert to cents
    const orderRef = orderData.orderRef || 'ORD-' + Date.now();
    
    try {
        const result = await createNGeniusOrder(
            amountInCents,
            orderRef,
            orderData.customerEmail,
            orderData.customerName
        );
        
        if (result.success) {
            // Redirect to N-Genius payment page
            window.location.href = result.paymentUrl;
        } else {
            alert('Payment Error: ' + result.error);
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('An error occurred. Please try again.');
    }
}

// Export for use
window.NGeniusPayment = {
    config: NGeniusConfig,
    processPayment: processPayment,
    createOrder: createNGeniusOrder,
    getToken: getNGeniusToken
};

console.log('N-Genius Payment Gateway loaded');
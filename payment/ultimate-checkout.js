// ULTIMATE Checkout Fix - Immediate execution
(function() {
    'use strict';
    
    console.log('=== CHECKOUT FIX LOADED ===');
    
    // N-Genius Configuration  
    const NGeniusConfig = {
        apiKey: 'YTkwNjZmZmItZmYzNi00Nzg5LTg1OWEtMzEwNjhiNjVjZjE0OjcwZGFiOTdlLTYyMGMtNDk5NS1hNDBjLTMyNWY2ZGIyNzE4ZQ==',
        outletReference: '7c6baf08-eb0e-459e-a8d4-c5f16193b59d',
        currency: 'AED'
    };

    const IDENTITY_URL = 'https://api-gateway.ngenius-payments.com/identity/auth/access-token';
    const ORDER_URL = `https://api-gateway.ngenius-payments.com/transactions/outlets/${NGeniusConfig.outletReference}/orders`;

    async function getToken() {
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

    async function createPayment(amount, orderRef, email, name) {
        const token = await getToken();
        
        const orderData = {
            action: 'SALE',
            amount: { currencyCode: NGeniusConfig.currency, value: amount },
            language: 'en',
            merchantOrderReference: orderRef,
            merchantAttributes: {
                redirectUrl: `https://mirruba-jewellery.com/payment/success.htm?order_ref=${orderRef}`
            },
            customerEmail: email,
            customerName: name
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
        return result;
    }

    // Override button click IMMEDIATELY
    function patchButtons() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(function(btn) {
            if (btn.textContent.includes('Checkout') || btn.textContent.includes('دفع')) {
                // Clone and replace to remove all event listeners
                const newBtn = btn.cloneNode(true);
                newBtn.textContent = btn.textContent;
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('CHECKOUT BUTTON CLICKED!');
                    
                    // Get inputs
                    const inputs = document.querySelectorAll('input');
                    let firstName = '', lastName = '', email = '', phone = '';
                    
                    inputs.forEach(function(input) {
                        const placeholder = (input.placeholder || '').toLowerCase();
                        if (placeholder.includes('first') || placeholder.includes('الاسم')) firstName = input.value;
                        else if (placeholder.includes('last')) lastName = input.value;
                        else if (placeholder.includes('email') || placeholder.includes('بريد')) email = input.value;
                        else if (placeholder.includes('1 (') || placeholder.includes('+')) phone = input.value;
                    });
                    
                    if (!firstName || !email) {
                        alert('Please fill in required fields');
                        return;
                    }
                    
                    newBtn.textContent = 'Processing...';
                    newBtn.disabled = true;
                    
                    try {
                        const orderRef = 'MIRRUB-' + Date.now();
                        const amount = 10000; // 100 AED test
                        const name = firstName + ' ' + lastName;
                        
                        console.log('Creating payment for:', amount, orderRef);
                        
                        const result = await createPayment(amount, orderRef, email, name);
                        console.log('Payment result:', result);
                        
                        if (result._links && result._links.payment) {
                            window.location.href = result._links.payment.href;
                        } else {
                            alert('Payment error: ' + (result.message || 'Failed'));
                            newBtn.textContent = 'Checkout';
                            newBtn.disabled = false;
                        }
                    } catch (err) {
                        console.error(err);
                        alert('Error: ' + err.message);
                        newBtn.textContent = 'Checkout';
                        newBtn.disabled = false;
                    }
                });
                
                console.log('Button patched!');
            }
        });
    }

    // Run immediately and keep checking
    patchButtons();
    setInterval(patchButtons, 1000);
    
    // Also watch for DOM changes
    document.addEventListener('DOMNodeInserted', patchButtons);
})();
console.log('Script loaded at:', new Date());
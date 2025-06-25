document.addEventListener('DOMContentLoaded', function() {
    const userEmail = localStorage.getItem('loggedInUserEmail'); 
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'; 

    const orderAdminNavLink = document.getElementById('orderAdminNavLink'); 
    const loginNavLink = document.getElementById('loginNavLink');
    const logoutNavLink = document.getElementById('logoutNavLink');
    const productNavLink = document.getElementById('productNavLink'); 
    const contactNavLink = document.getElementById('contactNavLink'); 

    if (orderAdminNavLink) { 
        if (isLoggedIn && userEmail === 'admin@mail.org') {
            orderAdminNavLink.textContent = 'Admin';
            orderAdminNavLink.href = 'admin.html';
            orderAdminNavLink.style.display = 'block'; 
        } else {
            orderAdminNavLink.textContent = 'Order';
            orderAdminNavLink.href = 'order.html';
            orderAdminNavLink.style.display = 'block'; 
        }
    }

    if (loginNavLink && logoutNavLink) {
        if (isLoggedIn && userEmail === 'admin@mail.org') { 
            loginNavLink.style.display = 'none';    
            logoutNavLink.style.display = 'block';  
        } else {
            loginNavLink.style.display = 'block';   
            logoutNavLink.style.display = 'none';   
        }
    }

    if (productNavLink) {
        if (isLoggedIn && userEmail === 'admin@mail.org') {
            productNavLink.style.display = 'none'; 
        } else {
            productNavLink.style.display = 'block'; 
        }
    }

    if (contactNavLink) { 
        if (isLoggedIn && userEmail === 'admin@mail.org') {
            contactNavLink.style.display = 'none'; 
        } else {
            contactNavLink.style.display = 'block'; 
        }
    }

    if (logoutNavLink) {
        logoutNavLink.addEventListener('click', function(event) {
            event.preventDefault(); 
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('loggedInUserEmail'); 
            sessionStorage.removeItem('isLoggedIn'); 
            sessionStorage.removeItem('loggedInUserEmail'); 
            window.location.reload(); 
        });
    }
});
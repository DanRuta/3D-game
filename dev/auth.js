//Ben's JS

async function signOut() {
    await gapi.auth2.getAuthInstance().signOut();
    console.log('User signed out.');
    logoutText.classList.toggle('invisible');
}

async function onSignIn(googleUser) {
    const profile = googleUser.getBasicProfile();

    const el = document.getElementById('welcomeTitle');
    el.textContent = 'Welcome, ' + profile.getName() + '!';
    fetch('./loginUser', {
        method: 'post',
        headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({name: profile.getName(), email: profile.getEmail()})
        }).then(res=>res.json())
        .catch(error => console.error('Error:', error))
        .then(res => console.log(res));
}

function isLoggedIn() {
    const logoutText = document.getElementById('logoutText')
    const logoutPipe = document.getElementById('logoutPipe')
    const user = gapi.auth2.getAuthInstance().currentUser.get()
    if (user) {
        logoutText.classList.toggle('d-none')
        logoutPipe.classList.toggle('d-none')

    }
}

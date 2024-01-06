import colorSchemes from './colors.js';

document.addEventListener('DOMContentLoaded', function () {
    const body = document.body;
    const changeColorSchemeButton = document.getElementById('changeColorScheme');
    applyColorScheme(colorSchemes.light); // default theme is light
    getUserThemePreference();
});

document.getElementById('flexSwitchCheckDefault').addEventListener('change', function() {
    const darkModeEnabled = this.checked;
    if(darkModeEnabled) {
        applyColorScheme(colorSchemes.dark);
        saveThemePreference('dark');
    } else {
        applyColorScheme(colorSchemes.light);
        saveThemePreference('light');
    }
});

function applyColorScheme(scheme) {
    Object.keys(scheme).forEach((key) => {
        console.log(`--${key}`, scheme[key]);
        document.documentElement.style.setProperty(`--color-${key}`, scheme[key]);
    });
}

function saveThemePreference(mode) {
    const jsonData = {
        theme: mode
    };

    fetch('/index/user/updatepreference', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data.message);

    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
}

async function getUserThemePreference() {
    try {
        const response = await fetch('/index/user/getpreference', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // additional headers like authorization headers if required
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to get user theme preference: ${response.status}`);
        }
        const data = await response.json();

        if ('theme' in data) {
            const userTheme = data.theme;
            const themeswitch = document.getElementById('flexSwitchCheckDefault');
            data.theme === 'light' ? applyColorScheme(colorSchemes.light) : applyColorScheme(colorSchemes.dark)
            data.theme === 'light' ? themeswitch.checked = false : themeswitch.checked = true;

            console.log(`Fetched User theme preference from db: ${userTheme}`);
        }

    } catch (error) {
        console.error(`Error fetching user theme preference: ${error.message}`);
    }
}

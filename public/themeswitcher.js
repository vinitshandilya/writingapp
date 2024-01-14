import colorSchemes from './colors.js';

document.addEventListener('DOMContentLoaded', function () {
    applyColorScheme(colorSchemes.light); // default theme is light
    getUserThemePreference();

    var colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(function(option) {
        option.addEventListener('click', function() {
            var color = getComputedStyle(option).getPropertyValue('--color');
            document.body.style.backgroundColor = color;
            if(color === 'black') {
                console.log('turning on dark mode');
                applyColorScheme(colorSchemes.dark);
                saveThemePreference('dark');
            } else if(color === '#ecd7c2') {
                console.log('turning on sepia mode');
                applyColorScheme(colorSchemes.sepia);
                saveThemePreference('sepia');
            } else {
                console.log('turning on light mode');
                applyColorScheme(colorSchemes.light);
                saveThemePreference('light');
            }
        });
    });

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
            console.log(`Fetched User theme preference from db: ${userTheme}`);

            if(userTheme === 'light') {
                applyColorScheme(colorSchemes.light);
                themeswitch.checked = false;
            } else if(userTheme === 'sepia') {
                applyColorScheme(colorSchemes.sepia);
                themeswitch.checked = false;
            } else {
                applyColorScheme(colorSchemes.dark);
                themeswitch.checked = true;
            }
        }

    } catch (error) {
        console.error(`Error fetching user theme preference: ${error.message}`);
    }
}


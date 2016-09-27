// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

// This process cannot access the same resources in app.js.
// The proper way to do IPC is through ipcMain and ipcRender.
// This process is `ipcMain`.

import {app, Menu, ipcMain, autoUpdater} from 'electron';
import {devMenuTemplate} from './menu/dev_menu_template';
import {editMenuTemplate} from './menu/edit_menu_template';
import createWindow from './helpers/window';
import populateClasses from './warm_up';
import cache from './simple_cache';

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from './env';
import createServer from './editor_api';

const Config = require('electron-config');
const config = new Config();
let preferences = config.get('preferences');

const os = require('os');

const setApplicationMenu = function setApplicationMenu() {
    const menus = [editMenuTemplate];
    
    if (env.name !== 'production') {
        menus.push(devMenuTemplate);
    }
    
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== 'production') {
    const userDataPath = app.getPath('userData');
    app.setPath('userData', `${userDataPath} (${env.name})`);
}

app.on('ready', () => {
    setApplicationMenu();
    
    const mainWindow = createWindow('main', {
        width: 500,
        height: 800,
    });
    
    mainWindow.loadURL('file://' + __dirname + '/app.html');
    const content = mainWindow.webContents;
    
    /*
     if (env.name === 'development') {
     mainWindow.openDevTools();
     } */
    
    // ==== Starts a local Ai.codes server ========
    // Pre-populating a bunch of frequently used classes.
    content.on('did-finish-load', () => {
        populateClasses(content);
    });
    
    const PORT = 26337;
    const expressServer = createServer(content, cache, isIncognitoClass);
    
    expressServer.listen(PORT, () => {
        // Callback triggered when server is successfully listening. Hurray!
        console.log('Server listening on: http://localhost:%s', PORT);
    });
    
    const platform = os.platform() + '_' + os.arch();
    const version = app.getVersion();
    
    // const version = '0.3.0';
    // const platform = 'osx_x64';
    
    autoUpdater.setFeedURL('https://aicodes-nuts.herokuapp.com/update/' + platform + '/' + version);
    autoUpdater.checkForUpdates();
    autoUpdater.on('update-downloaded',
        (event, releaseNotes, releaseName, releaseDate, updateURL) => {
            content.send('update-downloaded', releaseName);
        }
    );
    autoUpdater.on('checking-for-update', () => {
            // content.send('update-downloaded', "test");
        }
    );
    autoUpdater.on('update-available', () => {
            // content.send('update-downloaded', "test2");
        }
    );
    
    ipcMain.on('update-quit-install', () => {
        mainWindow.setClosable(true);
        autoUpdater.quitAndInstall();
    });
    // ====== ai.codes code ends =========
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('will-quit', () => {
    app.quit();
});

// Store the class -> extension (JSON object) mapping to cache.
ipcMain.on('ice-cache', (event, className, extension) => {
    cache.set(className, extension);
});

// Preferences
ipcMain.on('load-preference', (event) => {
    const result = config.get('preferences');
    if (result === undefined) {
        config.set('preferences', {incognito: []});
    }
    
    event.sender.send('update-preference-display', config.get('preferences'));
});

ipcMain.on('save-preference', (event, updatedPreferences) => {
    preferences = updatedPreferences;
    config.set('preferences', updatedPreferences);
});

function isIncognitoClass(className) {
    /// Skip incognito classes
    if (preferences === undefined || preferences.incognito === undefined) {
        return false;
    }
    
    const incognitoRules = preferences.incognito;
    for (let rule of incognitoRules) {
        if (className === rule) {
            return true;
        }
        
        if (className.search(rule) != -1) {
            return true;
        }
    }
    
    return false;
}

import { promises, readFileSync } from "fs";
import { dirname, join } from "path";
import { ColorThemeKind, ExtensionContext, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import { getOptions } from "../options";
import { getBMFontDatabase } from "./BMFontDatabase";
import { getSheetDatabase } from "./SheetDatabase";
import { createCCMenuItemSpriteExtra, createCCMISEithBS, createCCSprite, insertSpriteName } from "../source/snippet";
import { getSpriteDatabase } from "./SpriteDatabase";
import openExplorer from 'open-file-explorer';
import { Item } from "@shared/types";

function buildDatabasePageHtml(context: ExtensionContext) {
    // read html file and replace static content
    return readFileSync(join(context.extension.extensionPath, 'out/webview/database.html')).toString()
        .replace('DATABASE_INFO',
            `Sprites: ${
                getSpriteDatabase().getSpriteCount()
            }, sheets: ${
                getSpriteDatabase().getSheetCount()
            }, fonts: ${
                getSpriteDatabase().getFontCount()
            }, audio: ${
                getSpriteDatabase().getAudioCount()
            }, total: ${
                getSpriteDatabase().getTotalCount()
            }`
        )
        .replace('DATABASE_OPTIONS', 
            `${
                getSpriteDatabase().collections.reduce((a, v) => {
                    if (v.owner.mod) {
                        return a + `<option value="mod::${v.owner.mod.id}">${v.owner.mod.name}</option>`;
                    } else {
                        return a + `<option value="dir::${v.owner.directory}">${v.owner.directory}</option>`;
                    }
                }, '') +
                getSpriteDatabase().collections.reduce((a, v) => {
                    return a + Object.keys(v.sheets).reduce(
                        (sa, sv) => sa + `<option value="sheet::${v.owner.directory}::${sv}">${sv}</option>`,
                        ''
                    );
                }, '')
            }`
        );
}

export function buildDatabasePanel(context: ExtensionContext) {
    let targetEditor = window.activeTextEditor;
	context.subscriptions.push(window.onDidChangeActiveTextEditor(e => {
        if (e) {
            targetEditor = e;
        }
	}));

    const panel = window.createWebviewPanel(
        'gmdSpriteDatabase',
        'Sprite Database',
        ViewColumn.Beside,
        {
            enableScripts: true
        }
    );
    panel.iconPath = {
        light: Uri.file(join(context.extension.extensionPath, 'images/blockman-light.svg')),
        dark:  Uri.file(join(context.extension.extensionPath, 'images/blockman-dark.svg'))
    };
    panel.webview.html = buildDatabasePageHtml(context);
    panel.webview.onDidReceiveMessage( 
        message => {
            switch (message.command) {
                case 'get-database': {
                    panel.webview.postMessage({
                        command: 'database',
                        favorites: getSpriteDatabase().favorites,
                        default: 
                            getOptions().databaseShowFavoritesByDefault &&
                            getSpriteDatabase().favorites.length ? 'favorites' : 'all'
                    });
                } break;

                case 'get-items': {
                    switch (message.parts[0]) {
                        case 'all': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: getSpriteDatabase().getAll(),
                            });
                        } break;

                        case 'favorites': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: getSpriteDatabase().getFavorites(),
                            });
                        } break;

                        case 'fonts': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: getSpriteDatabase().getAllFonts(),
                            });
                        } break;

                        case 'audio': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: getSpriteDatabase().getAllAudio(),
                            });
                        } break;

                        case 'sheets': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: getSpriteDatabase().getAllSheets(),
                            });
                        } break;

                        case 'sprites': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: getSpriteDatabase().getAllSprites(),
                            });
                        } break;
                    
                        case 'mod': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: getSpriteDatabase().getAllInMod(message.parts[1]),
                            });
                        } break;

                        case 'dir': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: getSpriteDatabase().getAllInDir(message.parts[1]),
                            });
                        } break;

                        case 'sheet': {
                            const collection = getSpriteDatabase().collections.find(c => c.owner.directory === message.parts[1]);
                            panel.webview.postMessage({
                                command: 'items',
                                items: collection ?
                                    collection.sheets[message.parts[2]] : 
                                    [],
                            });
                        } break;
                    }
                } break;

                case 'set-favorite': {
                    if (message.favorite) {
                        getSpriteDatabase().favorites.push(message.name);
                    } else {
                        getSpriteDatabase().favorites = getSpriteDatabase().favorites.filter(f => f !== message.name);
                    }
                } break;

                case 'load-image': {
                    if (message.sprite.path.endsWith('.plist')) {
                        getSheetDatabase().loadSheet(message.sprite.path)
                            .then(sheet => sheet.extract(message.sprite.name))
                            .then(data => {
                                panel.webview.postMessage({
                                    command: 'image',
                                    element: message.element,
                                    data: data
                                });
                            })
                            .catch(_ => {
                                panel.webview.postMessage({
                                    command: 'image',
                                    element: message.element,
                                    data: null
                                });
                            });
                    } else {
                        promises.readFile(message.sprite.path, { encoding: 'base64' })
                            .then(data => {
                                panel.webview.postMessage({
                                    command: 'image',
                                    element: message.element,
                                    data: data.toString()
                                });
                            })
                            .catch(_ => {
                                panel.webview.postMessage({
                                    command: 'image',
                                    element: message.element,
                                    data: null
                                });
                            });
                    }
                } break;

                case 'load-audio': {
                    const path = window.activeColorTheme.kind === ColorThemeKind.Dark ?
                        join(context.extension.extensionPath, 'images/audio-dark.png') :
                        join(context.extension.extensionPath, 'images/audio-light.png');
                    promises.readFile(path, { encoding: 'base64' })
                        .then(data => {
                            panel.webview.postMessage({
                                command: 'image',
                                element: message.element,
                                data: data.toString()
                            });
                        })
                        .catch(_ => {
                            panel.webview.postMessage({
                                command: 'image',
                                element: message.element,
                                data: null
                            });
                        });
                } break;

                case 'load-font': {
                    getBMFontDatabase().loadFont(message.path)
                        .then(font => font.render(message.text))
                        .then(data => {
                            panel.webview.postMessage({
                                command: 'image',
                                element: message.element,
                                data: data
                            });
                        })
                        .catch(err => {
                            console.log(`Error rendering font: ${err}`);
                            panel.webview.postMessage({
                                command: 'image',
                                element: message.element,
                                data: null
                            });
                        });
                } break;

                case 'use-value': {
                    if (targetEditor && window.visibleTextEditors.some(e => e === targetEditor)) {
                        switch (message.type) {
                            case 'CCSprite': {
                                createCCSprite(targetEditor, message.value);
                            } break;

                            case 'CCMenuItemSpriteExtra': {
                                createCCMenuItemSpriteExtra(targetEditor, message.value);
                            } break;

                            case 'CCMenuItemSpriteExtra+ButtonSprite': {
                                createCCMISEithBS(targetEditor, message.value);
                            } break;

                            default: {
                                insertSpriteName(targetEditor, message.value);
                            } break;
                        }
                        panel.dispose();
                    } else {
                        window.showErrorMessage(
                            'You are not currently in an active editor. ' + 
                            'Please select an editor to continue :)'
                        );
                    }
                } break;

                case 'info': {
                    const item = message.item as Item;
                    window.showInformationMessage(
                        `Name: ${
                            item.name
                        }\nType: ${
                            item.type
                        }\nDirectory: ${
                            item.owner.directory
                        }\nMod: ${
                            item.owner.mod?.name ?? '<none>'
                        }`,
                        {
                            modal: true
                        },
                        'Open file location'
                    ).then(value => {
                        if (value === 'Open file location') {
                            openExplorer(dirname(message.sprite.path), _ => {});
                        }
                    });
                } break;

                default: {
                    console.log(`Unknown message.command: ${message.command}`);
                } break;
            }
        },
        undefined,
        context.subscriptions
    );
    return panel;
}

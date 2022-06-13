import { SnippetString, TextEditor } from "vscode";
import { Sprite } from "../types/sprite";

function getLiteral(value: Sprite) {
    // todo: check if id is from mod in current workspace or external
    return `"${value.name}"${value.mod ? '_spr' : ''}`;
}

function getVarName(value: Sprite) {
    const val = value.name.replace('.png', '').replace(/\w+?_/, '').replace(/_\w+/g, '');
    return val.charAt(0).toLowerCase() + val.substring(1);
}

export function createCCSprite(editor: TextEditor, value: Sprite) {
    const fun = value.path.endsWith('.plist') ? 'createWithSpriteFrameName' : 'create';
    const snippet = new SnippetString('auto ');
    snippet.appendPlaceholder(getVarName(value), 1);
    snippet.appendText(` = CCSprite::${fun}(${getLiteral(value)});`);
    editor.insertSnippet(snippet);
}

export function createCCMenuItemSpriteExtra(editor: TextEditor, value: Sprite) {
    const fun = value.path.endsWith('.plist') ? 'createWithSpriteFrameName' : 'create';
    const snippet = new SnippetString('auto ');
    snippet.appendPlaceholder(getVarName(value), 1);
    snippet.appendText('Spr');
    snippet.appendText(` = CCSprite::${fun}(${getLiteral(value)});\n\n`);
    snippet.appendText('auto ');
    snippet.appendPlaceholder(getVarName(value), 1);
    snippet.appendText('Btn = CCMenuItemSpriteExtra::create(\n\t');
    snippet.appendPlaceholder(getVarName(value), 1);
    snippet.appendText('Spr');
    snippet.appendText(', this, nullptr\n);');
    editor.insertSnippet(snippet);
}

export function createCCMISEithBS(editor: TextEditor, value: Sprite) {
    const snippet = new SnippetString('auto ');
    snippet.appendPlaceholder(getVarName(value), 1);
    snippet.appendText('Spr');
    snippet.appendText(` = ButtonSprite::create(\n\t"Hi mom", "bigFont.fnt", ${getLiteral(value)}\n);\n\n`);
    snippet.appendText('auto ');
    snippet.appendPlaceholder(getVarName(value), 1);
    snippet.appendText('Btn = CCMenuItemSpriteExtra::create(\n\t');
    snippet.appendPlaceholder(getVarName(value), 1);
    snippet.appendText('Spr');
    snippet.appendText(', this, nullptr\n);');
    editor.insertSnippet(snippet);
}

export function insertSpriteName(editor: TextEditor, value: Sprite) {
    editor.insertSnippet(new SnippetString(getLiteral(value)));
}

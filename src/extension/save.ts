import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { ExtensionContext, window } from "vscode";
import { getSpriteDatabase } from "./sprite";

let extension: ExtensionContext;

export function setContext(context: ExtensionContext) {
    extension = context;
}

export function getContext() {
    return extension;
}

export interface SaveData {
	favorites: string[];
}

export function loadData() {
	try {
        // read file if possible
		const savedata = JSON.parse(
			readFileSync(join(getContext().globalStorageUri.fsPath, 'data.json')).toString()
		) as SaveData;
        
		getSpriteDatabase().favorites = savedata.favorites;
	} catch {}
}

export function saveData() {
    try {
        // create save directory if it doesn't exist yet
        if (!existsSync(getContext().globalStorageUri.fsPath)) {
            mkdirSync(getContext().globalStorageUri.fsPath);
        }
        
        const data: SaveData = {
            favorites: getSpriteDatabase().favorites	
        };
        
        // save data
        writeFileSync(
            join(getContext().globalStorageUri.fsPath, 'data.json'),
            JSON.stringify(data)
        );
    } catch(err) {
        window.showErrorMessage(`Unable to save extension data: ${err}`);
    }
}

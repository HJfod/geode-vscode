import { getOptions, getWorkingInstallation } from './config';
import { join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { OutputChannel } from 'vscode';

export interface Sprite {
	sprite: string;
	sheet: string | null;
}

export class SpriteDatabase {
    private static instance = new SpriteDatabase();

    public searchDirectories: string[] = [];
	public sheetSprites: Sprite[] = [];
	public sprites: Sprite[] = [];

    private constructor() {}

	private refreshSprites() {
		this.sprites = [];
		this.sheetSprites = [];

        for (let dir of this.searchDirectories) {
            for (let file of readdirSync(dir)) {
                if (file.endsWith('.png')) {
                    if (file.endsWith('-hd.png') || file.endsWith('-uhd.png')) {
                        continue;
                    }
                    if (!this.sprites.includes({ sprite: file, sheet: null })) {
                        this.sprites.push({ sprite: file, sheet: null });
                    }
                }
                if (file.endsWith('.plist')) {
                    if (file.endsWith('-hd.plist') || file.endsWith('-uhd.plist')) {
                        continue;
                    }
                    readFileSync(join(dir, file)).toString().match(/\w+\.png/g)?.forEach(match => {
                        if (!this.sheetSprites.includes({ sprite: file, sheet: file })) {
                            this.sheetSprites.push({ sprite: match, sheet: file });
                        }
                    });
                }
            }
        }
	}

    public static get() {
        return SpriteDatabase.instance;
    }

    public refresh(channel: OutputChannel | null = null) {
        this.searchDirectories = [
            join(getWorkingInstallation()?.path as string, 'Resources'),
            ...getOptions().spriteSearchDirectories
        ];
	    channel?.append('Loading sprites... ');
        this.refreshSprites();
        channel?.appendLine(`done (found ${this.sprites?.length} + ${this.sheetSprites?.length})`);
    }
}

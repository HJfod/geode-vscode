import { window, commands, workspace, languages, ExtensionContext, CompletionItem, CompletionItemKind } from 'vscode';
import { existsSync, readFile, readFileSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join } from 'path';
import { getOptions, getWorkingInstallation, getConfigJson, updateOption } from './config';
import { SpriteDatabase } from './sprite';

function isSuiteInstalled(): boolean {
	const path = getOptions().geodeSuitePath;
	if (path) {
		return existsSync(path);
	}
	const env = process.env.GEODE_SUITE as string;
	if (env && existsSync(env)) {
		updateOption('geodeSuitePath', env);
		window.showInformationMessage('Geode: Automatically detected Suite path :)');
		return true;
	}
	return false;
}

function runCliCmd(cmd: string) {
	return execSync(`${getOptions().geodeSuitePath}/../bin/geode.exe ${cmd}`).toString();
}

export function activate(context: ExtensionContext) {
	
	console.log('Geode Support loaded :-)');

	if (!isSuiteInstalled()) {
		window.showErrorMessage(
			'Geode Suite path is not set! Please set ' +
			'\'geode-support.geodeSuitePath\' in user settings.'
		);
	}
	
	const channel = window.createOutputChannel('Geode');

	channel.appendLine(`Geode Suite location: ${getOptions().geodeSuitePath}`);
	channel.appendLine(`Geode CLI version: ${runCliCmd('--version')}`);
	
	SpriteDatabase.get().refresh(channel);

	context.subscriptions.push(commands.registerCommand('geode-support.launchGD', () => {
		if (!isSuiteInstalled()) {
			window.showErrorMessage(
				'Geode Suite path is not set! Please set ' +
				'\'geode-support.geodeSuitePath\' in user settings.'
			);
			return;
		}
		channel.append('Launching Geometry Dash... ');
		try {
			const inst = getWorkingInstallation();
			if (inst) {
				spawn(join(inst.path, inst.executable), { cwd: inst.path });
			}
			channel.appendLine('done');
		} catch(e) {
			channel.append('\n');
			channel.appendLine(`Error launching GD: ${e}`);
		}
	}));

	context.subscriptions.push(commands.registerCommand('geode-support.selectInstallation', () => {
		if (!isSuiteInstalled()) {
			window.showErrorMessage(
				'Geode Suite path is not set! Please set ' +
				'\'geode-support.geodeSuitePath\' in user settings.'
			);
			return;
		}
		window.showQuickPick(
			getConfigJson()?.installations.map((s, ix) => {
				return {
					label: join(s.path, s.executable),
					description: s.nightly ? 'Nightly' : 'Stable',
					command: ix
				};
			}) ?? []
		).then(inst => {
			if (inst) {
				try {
					channel.appendLine(`Set installation: ${runCliCmd(`config --cwi ${inst?.command}`)}`);
				} catch(e) {
					channel.appendLine(`Error setting installation: ${e}`);
				}
			}
		});
	}));

	context.subscriptions.push(languages.registerCompletionItemProvider(
		{
			scheme: "file",
			language: "cpp"
		},
		{
			provideCompletionItems(doc, pos) {
				return Array.from(
					SpriteDatabase.get().sheetSprites?.values()
				).concat(Array.from(
					SpriteDatabase.get().sprites?.values()
				)).map(s => {
					const item = new CompletionItem(s.sprite, CompletionItemKind.Value);
					item.documentation = s.sheet ?
						`Sprite frame from sheet ${s.sheet}` :
						"Standalone sprite";
					return item;
				});
			}
		}
	));
}

export function deactivate() {}

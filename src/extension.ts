import { window, commands, languages, ExtensionContext, CompletionItem, CompletionItemKind } from 'vscode';
import { existsSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join } from 'path';
import { Options, getWorkingInstallation, getConfigJson, loadConfigJson } from './config';
import { SpriteDatabase } from './sprite';

function isSuiteInstalled(): boolean {
	return existsSync(Options.get().geodeSuitePath ?? "");
}

function runCliCmd(cmd: string) {
	return execSync(`${Options.get().geodeSuitePath}/../bin/geode.exe ${cmd}`).toString();
}

export function activate(context: ExtensionContext) {
	console.log('Geode Support loaded :-)');

	loadConfigJson();

	console.log('Loaded config.json');

	if (!isSuiteInstalled()) {
		window.showErrorMessage(
			'Geode Suite path is not set! Please set ' +
			'\'geode-support.geodeSuitePath\' in user settings.'
		);
	}
	
	console.log('Checked suite');

	const channel = window.createOutputChannel('Geode');

	channel.appendLine(`Geode Suite location: ${Options.get().geodeSuitePath}`);
	channel.appendLine(`Geode CLI version: ${runCliCmd('--version')}`);
	
	console.log('Refreshing sprite database');

	SpriteDatabase.get().refresh(channel);

	console.log('Registering functions');

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

	console.log('Geode Support done :-)');
}

export function deactivate() {}

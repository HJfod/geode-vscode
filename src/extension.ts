import { window, commands, languages, ExtensionContext, CompletionItem, CompletionItemKind } from 'vscode';
import { existsSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join } from 'path';
import { getOptions, setupConfig, getWorkingInstallation, getConfig } from './config';
import { buildDatabasePanel, getSpriteDatabase, refreshSpriteDatabase } from './sprite';

function isSuiteInstalled(): boolean {
	return existsSync(getOptions().geodeSuitePath ?? "");
}

function runCliCmd(cmd: string) {
	return execSync(`${getOptions().geodeSuitePath}/../bin/geode.exe ${cmd}`).toString();
}

export function activate(context: ExtensionContext) {
	console.log('Geode Support loaded :-)');

	setupConfig();

	console.log('Loaded config.json');

	if (!isSuiteInstalled()) {
		window.showErrorMessage(
			'Geode Suite path is not set! Please set ' +
			'\'geode-support.geodeSuitePath\' in user settings.'
		);
	}
	
	console.log('Checked suite');

	const channel = window.createOutputChannel('Geode');

	channel.appendLine(`Geode Suite location: ${getOptions().geodeSuitePath}`);
	channel.appendLine(`Geode CLI version: ${runCliCmd('--version')}`);
	
	console.log('Refreshing sprite database');

	refreshSpriteDatabase(channel);

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
			getConfig()?.installations.map((s, ix) => {
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

	context.subscriptions.push(commands.registerCommand('geode-support.browseSpriteDatabase', () => {
		buildDatabasePanel(context);
	}));

	context.subscriptions.push(languages.registerCompletionItemProvider(
		{
			scheme: "file",
			language: "cpp"
		},
		{
			provideCompletionItems(doc, pos) {
				return Object.keys(getSpriteDatabase().sheets).map(key => {
					return getSpriteDatabase().sheets[key].map(spr => {
						const item = new CompletionItem(spr.name, CompletionItemKind.Value);
						item.detail = key;
						return item;
					});
				}).flat().concat(getSpriteDatabase().sprites.map(spr => {
					return new CompletionItem(spr.name, CompletionItemKind.Value);
				}));
			}
		}
	));

	console.log('Geode Support done :-)');
}

export function deactivate() {}


'use strict';

// for some reason .node files still don't work...
// it's in the dist directory but process.dlopen 
// still fails. i assume vscode is blocking it or 
// smth

const path = require('path');
const webpack = require('webpack');

/**@type {import('webpack').Configuration}*/
const config = {
    // vs code docs recommend target 'webworker' so 
    // the extension works on the web, but since this 
    // extension uses the filesystem a lot to work 
    // this would never work on the web by nature
    target: 'node',
    entry: './src/extension/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.ts', '.js'],
        alias: {},
        fallback: {}
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [{ loader: 'ts-loader' }]
            },
            {
              test: /\.node$/,
              loader: "node-loader",
            },
        ]
    }
};
module.exports = config;

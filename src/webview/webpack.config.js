'use strict';

const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // eslint-disable-line
const MiniCssExtractPlugin = require('mini-css-extract-plugin'); // eslint-disable-line
const InlineChunkHtmlPlugin = require('inline-chunk-html-plugin'); // eslint-disable-line

module.exports = (_, argv) => {
    return {
        entry: "./src/webview/database.ts",
        output: {
            filename: "database.js",
            path: /* argv.mode === 'production' ?
                path.join(__dirname, "../../dist/webview") : */
                path.join(__dirname, "../../out/webview")
        },
        resolve: {
            extensions: [ ".d.ts", ".ts", ".sass", ".scss", ".html" ]
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: "ts-loader"
                },
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        "style-loader",
                        "css-loader",
                        "sass-loader",
                    ],
                },
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                inject: true,
                template: './src/webview/database.html',
                filename: 'database.html',
            }),
            new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/database/]),
        ]
    };
};

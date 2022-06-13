
const path = require('path');
module.exports = {
    entry: "./src/webview/database.ts",
    output: {
        filename: "database.js",
        path: path.join(__dirname, "../../out/webview")
    },
    resolve: {
        extensions: [ ".ts" ]
    },
    module: {
        rules: [{ test: /\.ts$/, loader: "ts-loader" }]
    }
};

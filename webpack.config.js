const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin')


module.exports = {
	mode: 'production',
	devtool: 'inline-source-map',
    entry: './src/main.js',
    output: {
        filename: '[name]-[chunkhash:6].js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: [
                        ["@babel/preset-env", {"modules": false, "loose": false } ]
                    ],
                    plugins: [
                        "@babel/plugin-proposal-class-properties",
                    ]
                  }
                },
                exclude: '/node_modules/'
              }
        ]
    },
    plugins: [
        // 用法：new CleanWebpackPlugin(paths [, {options}])
        new CleanWebpackPlugin(),
        // new UglifyJsPlugin()
    ],
	optimization: {
   		// usedExports: true,  // usedExports其实就是我们所说的tree-shaking
        minimize: true,
	    minimizer: [
	        new TerserPlugin(),
            // new UglifyJsPlugin()
	    ],
	    // noEmitOnErrors: true
	},
}
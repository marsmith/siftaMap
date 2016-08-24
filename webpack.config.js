var webpack = require('webpack');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    devtool: 'source-map',
    entry: {
        main: ['./src/main.js',
            // 'turf/turf.min',
            'bootstrap/dist/js/bootstrap',
            'bootstrap/dist/css/bootstrap.css',
            'bootstrap-sidebar/dist/css/sidebar.css',
            'leaflet/dist/leaflet.css',
            'main_css']
    },
    output: {
        path: __dirname,
        filename: './src/[name].bundle.js',
        pathInfo: true
    },
    resolve: {
        alias: {
            main_css: __dirname + "/src/styles/main.css"
        }
    },
    module: {
       loaders: [
            {test: /\.js?$/, loader: "babel-loader"},
            {test: /\.css?$/, loader: "style-loader!css-loader!"},           
            { test: /\.html$/, loader: 'html' },
            { test: /\.(png|gif|jpg)$/, loader: 'file?name=src/images/[name].[ext]' },
            // For font-awesome, created by Turbo87:
            // https://gist.github.com/Turbo87/e8e941e68308d3b40ef6
            {test: /\.woff(2)?(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff&name=fonts/[name].[ext]" },
            {test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/octet-stream&name=fonts/[name].[ext]" },
            {test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file?name=fonts/[name].[ext]" },
            {test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=image/svg+xml&name=fonts/[name].[ext]" }
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
            esri: 'esri-leaflet'
        }),
        //this is a hack to make bootstrap fonts work
        new CopyWebpackPlugin([{ from: 'fonts', to: 'src/fonts' }], {copyUnmodified: true}),
        new webpack.optimize.UglifyJsPlugin({
            compress: { warnings: false }
        })
    ]
};
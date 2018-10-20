const path = require('path');

module.exports = {
  entry: './src/editor.js',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.ts', '.js' ]
  },
  output: {
    filename: 'editor.js',
    path: path.resolve(__dirname, 'dist')
  }
};


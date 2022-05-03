module.exports = {
  publicPath: './',
  runtimeCompiler: true,
  productionSourceMap: false,
  chainWebpack: config => {
  },
  css: {
    loaderOptions: {
      sass: {
        sassOptions: {
          data: `@import "@/stylesheets/_function.sass"`
        }
      }
    }
  },
  pages: {
    plugin: 'src/plugin/main.js',
    pi: 'src/pi/main.js'
  },
  devServer: {
    port: 8080,
    host: '0.0.0.0',
    disableHostCheck: true,
    https: false
  }
}

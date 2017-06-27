// See http://brunch.io for documentation.
exports.config = {
    files: {
      javascripts: {
        joinTo: {
          'vendor.js': /^(?!app)/, // Files that are not in `app` dir.
          'app.js': /^app/
        }
      },
      stylesheets: {joinTo: 'app.css'},

    },
    plugins: {
        babel: {presets: ['latest']}
    },
    npm: {
        globals: {
            $: 'jquery',
            jQuery: 'jquery',
            bootstrap: 'bootstrap',
            moment: 'moment',
            clipboard: 'clipboard'
        },
        styles: {
            flatpickr: ['dist/flatpickr.min.css'],
            bootstrap: ['dist/css/bootstrap.min.css']
        },
    }

}

var _           = require("lodash");
var connect     = require("connect");
var through     = require("through");
var http        = require("http");
var fs          = require("fs");
var serveStatic = require("serve-static");

var config      = require("./config");

/**
 * CWD directory helper for static dir
 * @param {String|undefined} [path]
 * @returns {string}
 */
var cwd = function (path) {
    return __dirname + "/../lib" + path || "";
};

/**
 * @param {ControlPanel} controlPanel
 * @param {Function} socketMw
 * @param {Function} connectorMw
 * @returns {*}
 */
function startServer(controlPanel, socketMw, connectorMw) {

    /**
     * Create a connect server
     */
    var app = connect();

    /**
     * Serve JS files
     */
    serveJsFiles(app, socketMw, connectorMw);

    /**
     * Serve the main (browserified) js file
     */
    serveMainAppFile(app, controlPanel.clientJs);

    /**
     * Serve the Page configuration file
     */
    serveMainAppConfigurationFile(app, controlPanel.pagesConfig);

    /**
     * Add any markup from plugins/hooks
     */
    insertPageMarkupFromHooks(app, controlPanel.pageMarkup, controlPanel.pages, controlPanel.templates);

    /**
     * History API fallback
     */
    app.use(require("connect-history-api-fallback"));

    /**
     * Serve static directory
     */
    app.use(serveStatic(cwd("")));

    /**
     * Return the server.
     */
    return http.createServer(app);
}

/**
 * @param {Connect} app
 * @param {Function} socketMw
 * @param {Function} connectorMw
 * @param {ControlPanel} controlPanel
 */
function serveJsFiles(app, socketMw, connectorMw) {
    app.use(config.socketJs, socketMw);
    app.use(config.connector, connectorMw);
}

/**
 * @param res
 * @param pageMarkup
 * @returns {*}
 */
function combineMarkup(res, pageMarkup) {
    res.setHeader("Content-Type", "text/html");
    return fs.createReadStream(cwd(config.indexPage))
        .pipe(through(function (buffer) {
            var file = buffer.toString();
            this.queue(file.replace(/%hooks%/g, pageMarkup));
        }))
        .pipe(res);
}

/**
 * @param app
 * @param pageMarkup
 */
function insertPageMarkupFromHooks(app, pageMarkup, pages, templates) {

    app.use(function (req, res, next) {
        if (req.url === "/" || pages[req.url.slice(1)]) {
            return combineMarkup(res, pageMarkup + templates);
        } else {
            next();
        }
    });
}

/**
 * @param app
 * @param clientJs
 */
function serveMainAppFile(app, clientJs) {
    app.use(config.appExtraJs, function (req, res) {
        res.setHeader("Content-Type", "application/javascript");
        res.end(clientJs);
    });
}
/**
 * @param app
 * @param clientJs
 */
function serveMainAppConfigurationFile(app, pagesConfig) {
    app.use(config.pagesConfig, function (req, res) {
        res.setHeader("Content-Type", "application/javascript");
        res.end(pagesConfig);
    });
}

/**
 *
 * @param controlPanel
 * @param app
 */
//function serveTemplates(app, templates) {
//    _.each(templates, function (template, path) {
//        app.use("/" + path, function (req, res, next) {
//            res.setHeader("Content-Type", "text/html");
//            res.end(template);
//        });
//    });
//}

module.exports = startServer;
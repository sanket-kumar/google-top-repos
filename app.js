/**
 * Created by Sanket on 2/1/17.
 */

if(!process.env.NODE_ENV)
{
    console.log('Please specify an environment to run your server');
    return;
}

process.env.NODE_CONFIG_DIR = __dirname + '/config/';
config = require('config');

var express         = require('express');
var http            = require('http');
var path            = require('path');
var favicon         = require('serve-favicon');
var bodyParser      = require('body-parser');
var morgan          = require('morgan');
var fs              = require('fs');

var app     = express();
// set up the port number
app.set('port', config.get('port'));
// view engine setup
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

var utils            = require('./core/utils');


////////// API Endpoints ///////////////////////////////

app.get('/v1/top_google_repos',     utils.topGoogleRepos);


//////////////////////////////////////////////////////////



var httpServer = http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
process.on("message", function(message){
    console.log("Received signal : " + message);
    if (message === 'shutdown') {
        httpServer.close();
        setTimeout(function(){
            process.exit(0);
        }, 15000);
    }
});

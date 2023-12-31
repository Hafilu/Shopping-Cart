var connectDb = require("./config/connection");
var createError = require('http-errors');
var express = require('express');
const dotenv = require("dotenv");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require("express-session")
var nocache = require("nocache")
var flash = require('express-flash');

var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');

var hbs = require("express-handlebars")
var handlebarsHelpers = require('handlebars-helpers')();
var fileUpload = require("express-fileupload")
var app = express();
app.use(cookieParser());
 



dotenv.config();
connectDb();

// view engine setup
app.engine("hbs",hbs({extname:"hbs",helpers: handlebarsHelpers, defaultLayout:"layout", runtimeOptions: {
  allowProtoMethodsByDefault: true,
},layoutDir:__dirname + "/views/layout/",partialsDir:__dirname + "/views/partials/"}))

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload())
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    cookie: { maxAge: 600000 },
    resave: false,
    saveUninitialized: true,
  })
);
app.use(nocache())
app.use(flash());

 
 
app.use('/', userRouter);

app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

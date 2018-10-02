
/**
 * BJERGGAARD.COM
 * Gulp file responsible for handling automatic FTP upload of edited files.
 *
 * Repository: https://github.com/nyvang/continuous-php-deployment.git
 *
 * Created by: Nyvang - github.com/nyvang
 */

 

 //  ---------------> S E T U P <---------------   //
 
//  Setup Modules and dependencies
const gulp 			= require('gulp-async-tasks')(require('gulp')),
	  gutil 		= require('gulp-util'),
	  ftp 			= require('vinyl-ftp'),
	  sass 			= require('gulp-sass'),
	  cssnano 		= require('gulp-cssnano'),
	  gulpIf 		= require('gulp-if'),
	  useref 		= require('gulp-useref'),
	  readline 		= require('readline-sync'),
	  runSequence 	= require('run-sequence'),
	  chalk 		= require('chalk'),
	  changed 		= require('gulp-changed'),
	  changedInPlace= require('gulp-changed-in-place'),
	  vfs 			= require('vinyl-fs'),
	  newer 		= require('gulp-newer'),
	  c 			= require('./gulpConfig');
 
//  FTP CONFIG
const devServer 	= c.ftpserver.development,
	  prodServer 	= c.ftpserver.producton,
	  username 		= c.ftpserver.user,
	  password 		= c.ftpserver.password,
	  ftpBuffer 	= c.ftpserver.buffer;
 
//  LOCAL / REMOTE PATHS
const viewMask 		= c.paths.phpViewsMask,
	  uploadDest 	= c.paths.uploadDest,
	  viewDir 		= c.paths.phpView,
	  classesDir 	= c.paths.phpClasses,
	  configDir 	= c.paths.phpConfig,
	  localBackupDir= c.paths.localBackup,
	  scssSrc 		= c.paths.scssSrc,
	  scssDest 		= c.paths.scssDest
	  cssSrc 		= c.paths.cssSrc,
	  cssDest 		= c.paths.cssDest;

// DEVELOPMENT || PRODUCTION
const isPRODUCTION = c.env.isProd;

// Node.js modules && setup
var config, opts, nodeFtpClient, nodeFTP;

function initFtpClient() {

	config = {
	    host: devServer,
	    port: 21,
	    user: username,
	    password: password
	};
	opts = {
		logging: 'basic',
		overwrite: 'all'
	};

	nodeFtpClient = require('ftp-client');
	return new nodeFtpClient(config, opts);

};

     //////////////////////////////////
     //       F U N C T I O N S      //
     //////////////////////////////////

// Development logger
const log = function(msg) {
	console.log(msg);
}

// Helper function 
async function isObjectAndEmpty(obj) {
	return Object.keys(obj).length === 0 && obj.constructor === Object;
}

// Setup connection
function getFtpConnection(isPRODUCTION) {
	
	var ftphost = (isPRODUCTION) ? prodServer : devServer;
	
	return ftp.create({
		host:		ftphost,
		user:		username,
		pass:		password,
		parallel:	10,
		//reload:	true,
		log:		gutil.log
	});
}

     //////////////////////////////////
     //          T A S K S           //
     //////////////////////////////////

gulp.task('cssmin', function(){
  return gulp.src(cssSrc)
    // Minifies only if it's a CSS file
    .pipe(gulpIf('*.css', cssnano()))
    .pipe(gulp.dest(cssDest))
});	 
	 
	 
gulp.task('scss', () => {
	return gulp.src(scssSrc)
		.pipe(sass({discardComments: {removeAll: true}}))
		.pipe(gulp.dest(scssDest));
});

	 
// FTP synchronisation 
gulp.task('up', () => {
	
	// Declare globs 
	const globs = [ viewDir, classesDir, configDir ];
	
	var connection = getFtpConnection(false);
	
	// Do Upload
	return gulp.src( globals, { base: '.', buffer: ftpBuffer} )
		.pipe(connection.newer( uploadDest ))
		.pipe(connection.dest( uploadDest ));
});

    //////////////////////////////////
    //       W A T C H I N G        //
    //////////////////////////////////

gulp.task('uploadAll', () => {
	
});

gulp.task('watch', () => { 
	gulp.watch(viewMask, ['up']); 
});

//gulp.task('watch', () => { gulp.watch(styleSrc, ['scss']); });

gulp.task('promptuser', function() {
	console.log('Runnnig this task will push the files to the LIVE server!');
	if(readline.keyInYN('Are you sure?')) {
		runSequence('scss', 'cssmin', 'up')
	}
});


//gulp.task('default', function() {
//	gulp.pipe(gulpIf('promptuser', ));
//});

gulp.task('build', ['scss', 'cssmin'], function (){
  console.log('Building files');
});

/**
 * Task: 		Backup-Prod
 * Function:  	Creates a ftp connection to the production server, and
 *				downloads all files in the three different directories 
 *				where files are edited. The paths are declared in the config file
 * Since: 		Version 2.0.0
 */
var backupProd = () => {

	var nodeFTP = initFtpClient();
	try {
		return nodeFTP.connect( () => {
			nodeFTP.download('/fuel/app/classes/', localBackupDir + "/fuel/app/classes/", {
		        overwrite: 'all'
		    }, function (result) {

		    	// Do error check
		        if(!isObjectAndEmpty(result.errors)) {
		        	log(" ");
		        	log(chalk`Backup was {greenBright.bold SUCCESSFUL!}. The new files will now be pushed to the server.`);
					readline.keyIn('Press any key to continiue...');
						pushToServer();
		        } else {
		        	log(" ");
		        	log(chalk.white.bold.bgRed("      Backup FAILED!      "));
		        	log(chalk`Continiue pushing to producton server, {red.bold WITHOUT} backup? (y/n):` );
					var answer = readline.keyInYN();

					if(answer) {
						pushToServer();
					} else {
						log(chalk`Push to producton has been {greenBright.bold cancelled}. This process will now terminate`);
						process.exit(0);
					}
		        }
		    });
		});

	} catch(err) {
		log(chalk.red('Err in function: \"backupProd\": Cause:'));
		log(chalk.red(err));
	}
};

/**
 * Task: 		Push-To-Server
 * Function:  	Creates a vinyl-ftp connection to the production server,
 * 				and tests the files to see if any is newer or diff in size.
 *				Files matching the above, is uploaded to the server.
 * Since: 		Version 2.0.0
 */
var pushToServer = () => {
			
	// Declare globs 
	const globs = [ viewDir, classesDir, configDir ];
	
	var connection = getFtpConnection(false); // Change to 'true' to use production server (when done testing)

	// Do Upload
	try{ 
		return gulp.src( globs, { base: '.', buffer: ftpBuffer} )
			.pipe(connection.newerOrDifferentSize(uploadDest))
			.pipe(connection.dest(uploadDest));
	} catch(err) {
		log(chalk.red('Err in function: \"pushToServer\": Cause:'));
		log(chalk.red(err));
	}	
};

    ////////////////////////////////////////////
    //   P U S H  T O   P R O D U C T I O N   //
    ////////////////////////////////////////////

gulp.task('push:async', () => {

	log(chalk.red.bold.bgYellowBright('                     W A R N I N G  !                    '));
	log(chalk.red.bold('You are about to push new/changed files to the production environment'));
	log(chalk.red.bold('Before any files are uploaded, the remote files are downloaded to the backup location'));
	log(" ");
	log(chalk.red.bold('Are you sure?'));
	log(chalk`To initiate the backup and the upload, enter \'{red.bold b}\'`);
	var answer = readline.prompt();

	if("b" == answer) {
		log(chalk.green("Initiating backup of producton environment !"));
		backupProd();

	} else {
		log(chalk`Push to producton has been {greenBright.bold cancelled}. This process will now terminate`);
		readline.keyIn('Press any key to continiue...');
	}
});


gulp.task('default', ['push:async']);
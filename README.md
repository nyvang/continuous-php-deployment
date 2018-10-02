# Continuous PHP Deployment #


A continuous deployment project I use when developing certain PHP projects. The project is based on Gulp and some additions. This project differs from others due to the PHP files. They dont need to be compiled and minified, but they should be uploaded non the less. I needed something to help me deploy changes instantly, and i dont care for saving a file and then remember to accept the upload-prompt from FileZilla before i can see the changes in my browser. 


The project is watching for changes to (PHP & SCSS) files, pushes these to the development server via FTP where I check the changes. 
When im done with the changes, the files are compiled and minified if needed, and then pushed to the production server. 

This means, no more copy/paste to/from dev FTP -> pc filesystem -> prod FTP where errors are prone to happen.
***

## Configuration
All config like filepaths, URL´s, login info etc are stored in a JSON-based config file.  
The file should be placed in the root dir besides the `gulpfile.js`  
The file is not included, but is structured like the following:

```JSON
{
    "ftpserver" : {
        "producton"     : "ftp.server.address", 
        "development"   : "ftp.server.address",
        "user"          : "loginString",
        "password"      : "passwordString",
        "buffer"        : false
    },
    "paths"    : {
        "phpViewsMask"  : "path/tp/php/files/*.php",
        "uploadDest"    : "/",
        "phpConfig"     : "some/file/path",
        "scssSrc"       : "path/to/scss/files/**/*.scss",
        "cssSrc"        : "path/to/css/files/**/*.css",
        "scssDest"      : "path/to/scss/files",
        "cssDest"       : "path/to/css/files"
    },
	
    "env"      : {
        "isProd"        : false
    }
}
```
---

## Tasks

The tasks can be called from the ClI with the command: `gulp [taskName]` e.g. `gulp up`  
The following tasks is available:

**`up`**

Responsible for check of new files, and to upload these to the development server.

**`scss`**

Responsible for compiling sass/scss file(s), concatenating the files into the css file.

**`cssmin`**

Responsible for minification of the css file. 

**`develop`**

Runns the watch task, which is an ongoing task looking for changes in the files every time a file is saved. When a file is changed, the file is auto uploaded and the task goes back to watch for other changes. 

**`build`**

Responsible for pushing the new/changed files to the **PRODUCTION** server.   
Since the files on the server is overwritten, the task wil inform the user about this **AND** prompt the user to confirm the upload. If the user confirm, the files will be uploaded, else, the task ends.  


**`backup-prod`**
Uses the new ftp client, this task does a complete backup of all editable paths (as described in `gulpConfig.json`), from the **PRODUCTION** environment.  
If the backup has any errors, the user is informed and asked wheather to proceed uploading the new/changed files. 

___

### Functions

**`getFtpConnection()`**

Setup and return ftp connection via Vinyl-Ftp


**`initFtpClient()`**

Create the Node.js ftp client objects and returns the client.  
This function uses the wrapper for Node ftp, called ftp-client.  
This client is a bit more advanced than vinyl ftp, and this is why there is two different clients.



const {exec}  = require('child_process');
const path = require('path');
const fs = require('fs');

exports.createBackup = ()=>{
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = path.join(__dirname,'..','backups',`backup-${timestamp}`);
    if(!fs.existsSync(backupFolder)){
        fs.mkdirSync(backupFolder,{recursive:true});
    }
    const dbURI = process.env.DATABASE_URI;
    const command = `mongodump --uri="${dbURI}" --out="${backupFolder}" --gzip`;
    exec(command,(error,stdout,stderr)=>{
        if(error){
            console.log(error);
            return
        }
        console.log('backup created');
    })
}
exports.restoreDB=(folderName)=>{
    const dbName = process.env.DB_NAME;
    const backupPath= path.join(__dirname,'..','backups',folderName,dbName);
     const dbURI = process.env.DATABASE_URI;
     const command = `mongorestore --uri="${dbURI}" --drop --gzip "${backupPath}"`;
     exec(command,(error,stdout,stderror)=>{
        if(error){
            console.log(error);
            return
        }
        console.log('restore success');
        
     })
}
const {createBackup,restoreDB} = require('../service/databases.service');

exports.createBackup=(req,res)=>{
   // try{
        createBackup();
        res.status(201).json({message:'backup created'})
//     }catch(err){
// res.status(500).json({error:err.message})
//     }
}

exports.restoreDB= (req,res)=>{
    const {folderName}= req.body;
    restoreDB(folderName);
    res.status(200).json({message:'restore success'});
}
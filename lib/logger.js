const fs = require("fs");
const { dirname } = require('path');
const appDir = dirname(require.main.filename);
const LOGNAME = "logAPP.log";
var filePath;

if (process.env.PROD == 0){
    filePath = `${appDir}/${LOGNAME}`
}else{
    filePath = `${process.env.APP_PATH_PRODUCTION}/${LOGNAME}`
}

var createdDate = (file)=>{  
    const { birthtime } = fs.statSync(file);
    return birthtime;
  }

var Write = (text) =>{

    if (fs.existsSync(filePath)){
        var dateFile = createdDate(filePath);
        let dateDel = new Date();
        dateDel.setDate(dateDel.getDate() - 5);

        if(dateFile < dateDel){
            fs.unlinkSync(filePath);
        }
    }
    
    fs.writeFile(filePath, text + "\r\n", { flag: 'a+' }, function (err) {
        if (err) throw err;
        console.log(`${text}`);
    });
    return filePath;
};

var ReadLines = ()=>{
    if (fs.existsSync(filePath)){
        var lines = new Array;
        try {
            const data = fs.readFileSync(filePath, 'utf8')
            data.split("\r\n").forEach(line => {
                lines.push(line);
            });
            return lines.reverse();
        } catch (err) {
            console.error(err)
        }
    }
    return null;
}

module.exports = {
    Write,
    ReadLines
}
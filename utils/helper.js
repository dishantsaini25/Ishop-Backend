function createUniqueName(imageName) {
    const ext = imageName.split('.').pop();
const uniqueId = Date.now() + Math.floor(Math.random() * 1000000) + imageName ;
return `${uniqueId}.${ext}`;
}


module.exports={
    createUniqueName 
}
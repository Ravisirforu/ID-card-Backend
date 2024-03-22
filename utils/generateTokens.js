
const generateTokens = (user) =>{
    console.log("usercall")
    let accesToken = user.generateAccesToken(user);
    
    return {accesToken} ;
}

module.exports = generateTokens;
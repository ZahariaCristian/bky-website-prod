const jwt = require('jsonwebtoken');

const authenticateKey = async (req, res, next) => {

    var Session = req.session;
    if (Session == null) return res.sendStatus(401)
    if (Session.token == null) return res.sendStatus(401)

    jwt.verify(Session.token, process.env.TOKEN_SECRET, (err, user) => {
        console.log(err);
        if (err) return res.sendStatus(403);

        req.user = user;
        next();
    });
}

module.exports = {
    authenticateKey
};